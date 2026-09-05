from unittest.mock import patch

from django.test import SimpleTestCase
from PIL import Image, ImageDraw

from .ai_tryon import (
    build_hair_edit_prompt, local_reference_hair_overlay,
    preserve_original_outside_hair,
)


class HairTryOnPreservationTests(SimpleTestCase):
    def test_prompt_unambiguously_labels_source_and_reference(self):
        prompt = build_hair_edit_prompt('Long curls', 'original', True)
        self.assertIn('Change ONLY the hair pixels in IMAGE 1', prompt)
        self.assertIn('Use IMAGE 2 only as a hairstyle reference', prompt)
        self.assertIn('Do not beautify', prompt)

    @patch('appointments.ai_tryon._detect_largest_face', return_value=(80, 65, 80, 100))
    def test_compositor_keeps_face_clothes_and_background_original(self, _face):
        original = Image.new('RGB', (240, 300), '#c7c7c7')
        draw = ImageDraw.Draw(original)
        draw.rectangle((80, 65, 160, 165), fill='#8b5a42')   # face
        draw.rectangle((55, 165, 185, 300), fill='#654321')  # clothes

        edited = Image.new('RGB', original.size, '#eeeeee')  # model altered background
        edited.paste('#f0b090', (80, 65, 161, 166))          # model altered face
        edited.paste('#222222', (42, 5, 199, 150))           # new hairstyle
        result = preserve_original_outside_hair(original, edited).convert('RGB')

        self.assertEqual(result.getpixel((10, 250)), original.getpixel((10, 250)))
        self.assertEqual(result.getpixel((120, 125)), original.getpixel((120, 125)))
        self.assertEqual(result.getpixel((120, 250)), original.getpixel((120, 250)))
        self.assertNotEqual(result.getpixel((120, 25)), original.getpixel((120, 25)))

    @patch('appointments.ai_tryon._detect_largest_face')
    def test_free_local_transfer_changes_hair_but_keeps_background(self, detect):
        detect.side_effect = [(80, 70, 80, 95), (60, 60, 80, 95)]
        client = Image.new('RGB', (240, 300), '#dddddd')
        ImageDraw.Draw(client).ellipse((80, 70, 160, 175), fill='#8b5a42')
        reference = Image.new('RGB', (200, 260), '#eeeeee')
        ref_draw = ImageDraw.Draw(reference)
        ref_draw.ellipse((25, 5, 175, 210), fill='#181818')
        ref_draw.ellipse((60, 60, 140, 165), fill='#9a6248')

        result = local_reference_hair_overlay(client, reference).convert('RGB')

        self.assertEqual(result.getpixel((5, 290)), client.getpixel((5, 290)))
        self.assertNotEqual(result.getpixel((120, 30)), client.getpixel((120, 30)))
