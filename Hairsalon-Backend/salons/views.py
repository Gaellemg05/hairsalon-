import logging
import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Salon, Service, SalonPublication, HairstylePublication, Review, SubscriptionTransaction
from .serializers import (
    SalonSerializer, ServiceSerializer, SalonPublicationSerializer,
    HairstylePublicationSerializer, ReviewSerializer,
    SubscriptionTransactionSerializer
)
from . import campay

logger = logging.getLogger(__name__)

class SalonViewSet(viewsets.ModelViewSet):
    queryset = Salon.objects.all()
    serializer_class = SalonSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        manager_id = self.request.query_params.get('manager')
        if manager_id:
            return self.queryset.filter(manager_id=manager_id)
        hairdresser_id = self.request.query_params.get('hairdresser')
        if hairdresser_id:
            return self.queryset.filter(hairdressers__id=hairdresser_id)

        user = self.request.user
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'subscribe', 'transactions', 'check_subscription', 'demo_approve', 'add_hairdresser', 'remove_hairdresser']:
            if user and user.is_authenticated:
                return self.queryset.all()

        # For public/client salon list, only show salons with an active subscription
        return self.queryset.filter(subscription_active_until__gt=timezone.now())

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        now = timezone.now()
        is_active = bool(instance.subscription_active_until and instance.subscription_active_until > now)
        user = request.user
        is_owner_or_staff = (
            user and user.is_authenticated and (
                instance.manager == user or user.is_staff or instance.hairdressers.filter(id=user.id).exists()
            )
        )
        if not is_active and not is_owner_or_staff:
            return Response(
                {'error': 'This salon is currently inactive or suspended.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # New salons start without an active subscription until paid
        salon = serializer.save(manager=self.request.user, subscription_active_until=None)
        if self.request.user.role == 'hairdresser':
            salon.hairdressers.add(self.request.user)

    @action(detail=True, methods=['post'])
    def add_hairdresser(self, request, pk=None):
        salon = self.get_object()
        hairdresser_id = request.data.get('hairdresser_id')
        if not hairdresser_id:
            return Response({'error': 'hairdresser_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            hairdresser = User.objects.get(id=hairdresser_id, role='hairdresser')
            salon.hairdressers.add(hairdresser)
            return Response({'status': 'added'})
        except User.DoesNotExist:
            return Response({'error': 'Hairdresser not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def remove_hairdresser(self, request, pk=None):
        salon = self.get_object()
        hairdresser_id = request.data.get('hairdresser_id')
        if not hairdresser_id:
            return Response({'error': 'hairdresser_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        salon.hairdressers.remove(hairdresser_id)
        return Response({'status': 'removed'})

    @action(detail=True, methods=['post'])
    def subscribe(self, request, pk=None):
        salon = self.get_object()
        if salon.manager != request.user and not request.user.is_staff:
            return Response({'error': 'Only the manager can subscribe'}, status=status.HTTP_403_FORBIDDEN)
        
        phone = request.data.get('phone_number')
        operator = request.data.get('operator') or 'momo'
        if not phone:
            return Response({'error': 'phone_number is required'}, status=status.HTTP_400_BAD_REQUEST)

        fee = getattr(settings, 'CAMPAY_SUBSCRIPTION_FEE', 25)
        description = f"Subscription for {salon.name}"
        ext_ref = str(uuid.uuid4())

        try:
            campay_data = campay.collect_payment(
                phone_number=phone,
                amount=fee,
                description=description,
                external_reference=ext_ref
            )
            reference = campay_data.get('reference') or ext_ref
            ussd_code = campay_data.get('ussd_code') or ('*126#' if 'momo' in operator.lower() else '*150#')
            campay_operator = campay_data.get('operator') or operator

            txn = SubscriptionTransaction.objects.create(
                salon=salon,
                amount=fee,
                operator=campay_operator,
                phone_number=phone,
                reference=reference,
                status='PENDING',
                transaction_type='subscription'
            )

            return Response({
                'status': 'PENDING',
                'reference': reference,
                'ussd_code': ussd_code,
                'operator': campay_operator,
                'amount': fee,
                'transaction_id': txn.id,
                'message': f'Payment prompt sent to {phone}. Please confirm the prompt on your phone (USSD: {ussd_code}).'
            })
        except Exception as e:
            logger.exception("CamPay payment initiation error")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def check_subscription(self, request, pk=None):
        salon = self.get_object()
        if salon.manager != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        reference = request.query_params.get('reference')
        if not reference:
            return Response({'error': 'reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            txn = SubscriptionTransaction.objects.filter(salon=salon, reference=reference).first()
            campay_res = campay.check_transaction_status(reference)
            raw_status = (campay_res.get('status') or '').upper()
            now = timezone.now()

            if raw_status == 'SUCCESSFUL':
                if txn and txn.status != 'SUCCESSFUL':
                    txn.status = 'SUCCESSFUL'
                    txn.operator_reference = campay_res.get('operator_reference', '')
                    txn.code = campay_res.get('code', '')
                    txn.save()

                    if salon.subscription_active_until and salon.subscription_active_until > now:
                        salon.subscription_active_until += timedelta(days=30)
                    else:
                        salon.subscription_active_until = now + timedelta(days=30)
                    salon.save()

                return Response({
                    'status': 'SUCCESSFUL',
                    'subscription_active_until': salon.subscription_active_until,
                    'message': f'Payment successful! Subscription active until {salon.subscription_active_until.strftime("%Y-%m-%d")}.'
                })

            elif raw_status == 'FAILED':
                if txn and txn.status != 'FAILED':
                    txn.status = 'FAILED'
                    txn.save()
                reason = campay_res.get('reason') or 'Payment failed or was cancelled.'
                return Response({
                    'status': 'FAILED',
                    'reason': reason,
                    'message': f'Payment failed: {reason}'
                })

            else:
                return Response({
                    'status': 'PENDING',
                    'message': 'Waiting for payment confirmation on phone...'
                })

        except Exception as e:
            logger.exception("Error checking CamPay status")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def demo_approve(self, request, pk=None):
        """Allows testing sandbox approval in demo mode without real USSD prompt."""
        if getattr(settings, 'CAMPAY_ENVIRONMENT', 'DEMO') != 'DEMO':
            return Response({'error': 'Only available in demo environment'}, status=status.HTTP_403_FORBIDDEN)
        
        salon = self.get_object()
        if salon.manager != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        reference = request.data.get('reference')
        txn = None
        if reference:
            txn = SubscriptionTransaction.objects.filter(salon=salon, reference=reference).first()
        if not txn:
            txn = salon.subscription_transactions.filter(status='PENDING').order_by('-created_at').first()

        now = timezone.now()
        if salon.subscription_active_until and salon.subscription_active_until > now:
            salon.subscription_active_until += timedelta(days=30)
        else:
            salon.subscription_active_until = now + timedelta(days=30)
        salon.save()

        if txn:
            txn.status = 'SUCCESSFUL'
            txn.save()

        return Response({
            'status': 'SUCCESSFUL',
            'subscription_active_until': salon.subscription_active_until,
            'message': f'[Demo] Subscription activated until {salon.subscription_active_until.strftime("%Y-%m-%d")}.'
        })

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        salon = self.get_object()
        qs = salon.subscription_transactions.exclude(transaction_type='trial').exclude(amount=10000).order_by('-created_at')
        serializer = SubscriptionTransactionSerializer(qs, many=True)
        return Response(serializer.data)

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        salon_id = self.request.query_params.get('salon')
        if salon_id:
            return self.queryset.filter(salon_id=salon_id)
        return self.queryset.filter(salon__subscription_active_until__gt=timezone.now())

class SalonPublicationViewSet(viewsets.ModelViewSet):
    queryset = SalonPublication.objects.all()
    serializer_class = SalonPublicationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = SalonPublication.objects.all().select_related('salon').order_by('-created_at')
        salon_id = self.request.query_params.get('salon')
        if salon_id:
            return qs.filter(salon_id=salon_id)
        return qs.filter(salon__subscription_active_until__gt=timezone.now())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class HairstylePublicationViewSet(viewsets.ModelViewSet):
    queryset = HairstylePublication.objects.all()
    serializer_class = HairstylePublicationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = HairstylePublication.objects.select_related('salon', 'hairdresser').prefetch_related('salon__services').order_by('-created_at')
        hairdresser_id = self.request.query_params.get('hairdresser')
        if hairdresser_id:
            qs = qs.filter(hairdresser_id=hairdresser_id)
        return qs.filter(salon__subscription_active_until__gt=timezone.now())

    def perform_create(self, serializer):
        serializer.save(hairdresser=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(hairdresser=self.request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        salon_id = self.request.query_params.get('salon')
        if salon_id:
            return self.queryset.filter(salon_id=salon_id)
        return self.queryset

    def perform_create(self, serializer):
        appointment_id = self.request.data.get('appointment')
        extra_kwargs = {'client': self.request.user}
        if appointment_id:
            extra_kwargs['appointment_id'] = appointment_id
        serializer.save(**extra_kwargs)
