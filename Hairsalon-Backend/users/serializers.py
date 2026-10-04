from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.FileField(required=False, allow_null=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'profile_picture', 'profile_image')

    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile_image') and obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return f"http://127.0.0.1:8000{obj.profile_image.url}"
        if obj.profile_picture:
            if obj.profile_picture.startswith('/media/'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile_picture)
                return f"http://127.0.0.1:8000{obj.profile_picture}"
            return obj.profile_picture
        return ''

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        for f in ['profile_picture', 'profile_image']:
            val = ret.get(f)
            if val and isinstance(val, str) and val.startswith('/media/'):
                ret[f] = request.build_absolute_uri(val) if request else f"http://127.0.0.1:8000{val}"
        return ret

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'profile_picture')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'client'),
            phone_number=validated_data.get('phone_number', ''),
            profile_picture=validated_data.get('profile_picture', '')
        )
        return user
