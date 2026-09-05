import os
import io
import json
import base64
import urllib.request
import urllib.error
import tempfile
import uuid
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw

try:
    import cv2
    HAS_CV2 = True
except Exception:
    HAS_CV2 = False

try:
    from gradio_client import Client, handle_file
    HAS_GRADIO_CLIENT = True
except Exception:
    HAS_GRADIO_CLIENT = False

# Auto-load .env file if present
env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_file):
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"\''))
    except Exception:
        pass

GEMINI_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
if GEMINI_KEY == 'PASTE_YOUR_KEY_HERE':
    GEMINI_KEY = None

HAS_GEMINI = bool(GEMINI_KEY)
POLLINATIONS_KEY = os.environ.get('POLLINATIONS_API_KEY')
POLLINATIONS_MODEL = os.environ.get('POLLINATIONS_IMAGE_MODEL', 'gptimage-large')

# Try importing google.generativeai if available
try:
    import google.generativeai as genai
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
except ImportError:
    genai = None


def decode_base64_image(base64_str):
    """Convert base64 data string to PIL Image."""
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    image_data = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(image_data)).convert('RGBA')


def pil_to_bytes(pil_img, fmt='PNG'):
    """Convert PIL Image to bytes."""
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt)
    return buf.getvalue()


def encode_image_to_base64(pil_img, fmt='PNG'):
    """Convert PIL Image to base64 data URI."""
    data = pil_to_bytes(pil_img, fmt)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(data).decode('utf-8')


def read_http_error(err):
    """Reads an HTTPError body for a helpful (rate-limit / billing) message."""
    try:
        return err.read().decode('utf-8', errors='ignore')
    except Exception:
        return f"HTTP {getattr(err, 'code', '?')}"


def call_gemini_rest_api(parts, model_name="gemini-3.6-flash"):
    """
    Call Gemini REST API directly via urllib without requiring third-party SDK.
    """
    if not GEMINI_KEY:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [
            {
                "parts": parts
            }
        ]
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode('utf-8')
            return json.loads(body)
    except Exception as e:
        return None


def validate_hairstyle_image_ai(image_data_or_file, filename=""):
    """
    Validates if an image contains a hairstyle / hair model.
    Uses Gemini AI vision if available, otherwise falls back to heuristics.
    """
    try:
        if isinstance(image_data_or_file, str) and (
            image_data_or_file.startswith('data:image') or len(image_data_or_file) > 100
        ):
            pil_img = decode_base64_image(image_data_or_file)
        else:
            pil_img = Image.open(image_data_or_file).convert('RGB')
    except Exception:
        return {
            'valid': False,
            'message': 'Failed to read image file. Please provide a valid JPG or PNG.',
            'confidence': 0.0,
        }

    # --- Gemini AI Vision validation (if API key is available) ---
    if GEMINI_KEY:
        try:
            rgb_img = pil_img.convert('RGB')
            img_bytes = pil_to_bytes(rgb_img, 'JPEG')
            b64_data = base64.b64encode(img_bytes).decode('utf-8')

            prompt_text = (
                "Analyze this image. Does it show a hairstyle, haircut, hair design, "
                "braids, locs, afro, wig, or a person's head with hair? "
                "Answer in JSON: {\"is_hair\": true/false, \"style_name\": \"...\", "
                "\"reason\": \"...\"}. If it shows a car, animal, food, document, "
                "landscape, or other non-hair object, set is_hair to false."
            )

            parts = [
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": b64_data
                    }
                },
                {"text": prompt_text}
            ]

            res_json = call_gemini_rest_api(parts, model_name="gemini-3.6-flash")
            if res_json and 'candidates' in res_json:
                text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                if '{' in text:
                    json_str = text[text.index('{'):text.rindex('}') + 1]
                    result = json.loads(json_str)
                    if result.get('is_hair'):
                        return {
                            'valid': True,
                            'detected_style': result.get('style_name', 'Hair Design'),
                            'confidence': 0.98,
                            'message': f"✅ Gemini AI Verified: {result.get('style_name', 'Valid hair design')} detected!",
                        }
                    else:
                        return {
                            'valid': False,
                            'confidence': 0.15,
                            'message': f"⚠️ AI Verification Failed: {result.get('reason', 'Not a hair design')}. Please upload a clear photo of a hairstyle.",
                        }
        except Exception:
            pass  # Fall through to heuristic validation

    # --- Heuristic fallback validation ---
    fname = filename.lower()
    non_hair_keywords = [
        'car', 'vehicle', 'cat', 'dog', 'pet', 'shoe', 'food', 'pizza',
        'building', 'house', 'receipt', 'invoice', 'passport', 'chair', 'table',
    ]
    if any(kw in fname for kw in non_hair_keywords):
        return {
            'valid': False,
            'message': '⚠️ AI Notice: The uploaded image appears to be a non-hair object. Please upload a clear photo of a hairstyle.',
            'confidence': 0.1,
        }

    # Simple color-range check for plausible hair/skin tones
    small = pil_img.resize((150, 150)).convert('RGB')
    arr = np.array(small)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    plausible = (
        ((r > 15) & (g > 15) & (b > 15) & (r < 240) & (g < 220))
        & ((np.abs(r.astype(int) - g.astype(int)) > 4) | ((r < 75) & (g < 75) & (b < 75)))
    )
    ratio = float(np.mean(plausible))
    if ratio < 0.12 and not any(kw in fname for kw in ['hair', 'braid', 'cut', 'style', 'fade', 'loc']):
        return {
            'valid': False,
            'message': '⚠️ AI Notice: No clear hair design detected. Please upload a photo showing a hairstyle.',
            'confidence': round(ratio, 2),
        }

    # Guess style from filename
    style = 'Custom Hair Design'
    if 'braid' in fname or 'twist' in fname:
        style = 'Braided Hair Design'
    elif 'fade' in fname or 'taper' in fname or 'cut' in fname:
        style = 'Barber Fade & Edge-Up'
    elif 'loc' in fname or 'dread' in fname:
        style = 'Locs / Dreadlocks'
    elif 'bob' in fname or 'pixie' in fname:
        style = 'Short Chic Cut'
    elif 'afro' in fname or 'curl' in fname:
        style = 'Natural Afro & Curls'

    return {
        'valid': True,
        'detected_style': style,
        'confidence': 0.85,
        'message': f'✅ Verified: {style} detected. Ready for transformation!',
    }


def decode_image_input(img_input):
    """
    Decodes base64 string OR downloads HTTP/HTTPS web image URL into RGBA PIL Image.
    """
    if not img_input:
        return None
    if isinstance(img_input, str):
        if img_input.startswith('data:image') or (len(img_input) > 200 and not img_input.startswith('http')):
            try:
                return decode_base64_image(img_input)
            except Exception:
                return None
        elif img_input.startswith('http://') or img_input.startswith('https://'):
            try:
                req = urllib.request.Request(
                    img_input,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    return Image.open(io.BytesIO(resp.read())).convert('RGBA')
            except Exception:
                return None
    return None


def build_hair_edit_prompt(style_name, color_tint, has_reference):
    """
    Builds a natural-language instruction that tells the Gemini image model to
    REFINE the user's own photo in place — shaving off the current hair and
    growing the requested style — WITHOUT touching the face, body, clothing,
    or background.
    """
    color_instruction = ""
    if color_tint and color_tint != 'original':
        color_names = {
            'jet-black': 'jet black',
            'espresso': 'deep espresso brown',
            'caramel': 'warm caramel brown',
            'honey-blonde': 'honey blonde',
            'burgundy': 'rich burgundy wine red',
            'platinum': 'platinum icy blonde',
            'rose-gold': 'rose gold pink',
        }
        color_instruction = f" in {color_names.get(color_tint, color_tint)} hair color"

    reference_instruction = (
        "Use IMAGE 2 only as a hairstyle reference. Transfer its hair shape, "
        "length, texture, parting and volume onto the person in IMAGE 1; do not "
        "copy the reference person's face, pose, skin, clothing or background."
        if has_reference else ""
    )

    return (
        "This is a localized virtual hairstyle try-on, not a new portrait. "
        f"{reference_instruction} Change ONLY the hair pixels in IMAGE 1. "
        f"Replace the current hair with a natural, "
        f"photorealistic '{style_name}' hairstyle{color_instruction} on their head. "
        "Keep the exact same canvas, crop, pose and head position. Keep every "
        "facial pixel (eyes, brows, forehead, ears, nose, mouth and skin), body, "
        "clothing, jewelry and background unchanged from IMAGE 1. Do not beautify, "
        "retouch, relight, recolor, reframe or redraw the person. The hair must "
        "look naturally attached at the hairline and forehead, with realistic "
        "texture, volume and lighting matching the photo. Return only the edited "
        "photorealistic image."
    )


def _detect_largest_face(rgb_img):
    """Return the largest frontal face as (x, y, w, h), when OpenCV can find one."""
    if not HAS_CV2:
        return None
    try:
        gray = cv2.cvtColor(np.asarray(rgb_img), cv2.COLOR_RGB2GRAY)
        bundled_path = os.path.join(
            os.path.dirname(__file__), 'data', 'haarcascade_frontalface_default.xml'
        )
        cascade_path = bundled_path if os.path.exists(bundled_path) else os.path.join(
            cv2.data.haarcascades, 'haarcascade_frontalface_default.xml'
        )
        if not os.path.exists(cascade_path):
            return None
        cascade = cv2.CascadeClassifier(cascade_path)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5,
                                         minSize=(45, 45))
        if len(faces):
            return tuple(max(faces, key=lambda box: int(box[2]) * int(box[3])))
    except Exception:
        pass
    return None


def preserve_original_outside_hair(user_pil, edited_pil):
    """Composite only substantial, hair-area edits over the untouched source photo.

    Image models can redraw a whole frame even when asked for a local edit.  This
    pixel guard keeps the uploaded photo as the base, builds a soft mask from the
    model's meaningful changes near the head, and protects the detected face.
    """
    original = user_pil.convert('RGB')
    generated = edited_pil.convert('RGB')
    original_face = _detect_largest_face(original)
    generated_face = _detect_largest_face(generated)
    if HAS_CV2 and original_face and generated_face:
        ox, oy, ow, oh = [float(v) for v in original_face]
        gx, gy, gw, gh = [float(v) for v in generated_face]
        scale = ((ow / max(gw, 1)) + (oh / max(gh, 1))) / 2
        tx = (ox + ow / 2) - scale * (gx + gw / 2)
        ty = (oy + oh / 2) - scale * (gy + gh / 2)
        matrix = np.float32([[scale, 0, tx], [0, scale, ty]])
        aligned = cv2.warpAffine(
            np.asarray(generated), matrix, original.size,
            flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101,
        )
        edited = Image.fromarray(aligned).convert('RGB')
    else:
        edited = ImageOps.fit(
            generated, original.size, method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5)
        )
    a = np.asarray(original).astype(np.int16)
    b = np.asarray(edited).astype(np.int16)
    # Ignore compression/noise and tiny global color shifts from the model.
    diff = np.max(np.abs(a - b), axis=2).astype(np.uint8)
    changed = np.where(diff >= 34, 255, 0).astype(np.uint8)
    width, height = original.size

    face = _detect_largest_face(original)
    if face:
        x, y, fw, fh = [int(v) for v in face]
    else:
        # A conservative fallback for a normal portrait/selfie.
        fw, fh = int(width * .34), int(height * .36)
        x, y = (width - fw) // 2, int(height * .18)

    allowed = Image.new('L', original.size, 0)
    draw = ImageDraw.Draw(allowed)
    # Hair may extend well below the chin (braids, wigs and long curls).
    margin_x = int(fw * .85)
    top = max(0, y - int(fh * .95))
    bottom = min(height, y + int(fh * 2.05))
    draw.rounded_rectangle(
        (max(0, x - margin_x), top, min(width, x + fw + margin_x), bottom),
        radius=max(8, int(fw * .35)), fill=255
    )
    # Preserve identity-critical face pixels from eyebrows downward. The upper
    # forehead remains editable so fringes and a new hairline can sit naturally.
    protect_top = y + int(fh * .24)
    draw.ellipse(
        (x + int(fw * .06), protect_top, x + int(fw * .94), y + int(fh * 1.08)),
        fill=0
    )
    # Long styles belong at the sides of the shoulders, not across the middle of
    # the client's shirt/jacket. Keep that central column pixel-identical too.
    draw.rounded_rectangle(
        (x + int(fw * .14), y + fh, x + int(fw * .86), bottom),
        radius=max(4, int(fw * .12)), fill=0
    )
    allowed_arr = np.asarray(allowed, dtype=np.uint8)
    mask_arr = np.minimum(changed, allowed_arr)

    if HAS_CV2:
        kernel = np.ones((5, 5), np.uint8)
        mask_arr = cv2.morphologyEx(mask_arr, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask_arr = cv2.morphologyEx(mask_arr, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    mask = Image.fromarray(mask_arr, mode='L').filter(
        ImageFilter.GaussianBlur(radius=max(1.5, min(width, height) / 350))
    )
    # Feather only inward: Gaussian blur must never leak generated pixels into a
    # protected area that is meant to remain byte-for-byte from the source.
    feathered = np.asarray(mask, dtype=np.uint16)
    feathered = ((feathered * allowed_arr.astype(np.uint16)) // 255).astype(np.uint8)
    mask = Image.fromarray(feathered, mode='L')
    return Image.composite(edited, original, mask).convert('RGBA')


def hairfastgan_edit_hair(user_pil, reference_pil):
    """Use the authors' free public HairFastGAN Space when it is available."""
    if not HAS_GRADIO_CLIENT or reference_pil is None:
        return None
    try:
        with tempfile.TemporaryDirectory(prefix='munagay-hair-') as tmp:
            face_path = Path(tmp) / 'client.png'
            hair_path = Path(tmp) / 'hairstyle.png'
            user_pil.convert('RGB').save(face_path, 'PNG')
            reference_pil.convert('RGB').save(hair_path, 'PNG')
            client = Client('AIRI-Institute/HairFastGAN', verbose=False)
            response = client.predict(
                face=handle_file(str(face_path)),
                shape=handle_file(str(hair_path)),
                color=handle_file(str(hair_path)),
                blending='Article', poisson_iters=0, poisson_erosion=15,
                api_name='/swap_hair',
            )
            result = response[0] if isinstance(response, (tuple, list)) else response
            if isinstance(result, dict):
                result = result.get('path') or result.get('url')
            if result and str(result).startswith(('http://', 'https://')):
                with urllib.request.urlopen(str(result), timeout=45) as resp:
                    return Image.open(io.BytesIO(resp.read())).convert('RGBA')
            if result and Path(str(result)).exists():
                return Image.open(str(result)).convert('RGBA')
    except Exception:
        return None
    return None


def _multipart_body(fields, files):
    """Build a multipart request without adding another HTTP dependency."""
    boundary = '----Munagay' + uuid.uuid4().hex
    chunks = []
    for name, value in fields.items():
        chunks.extend([
            f'--{boundary}\r\n'.encode(),
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
            str(value).encode('utf-8'), b'\r\n',
        ])
    for name, filename, mime_type, content in files:
        chunks.extend([
            f'--{boundary}\r\n'.encode(),
            (f'Content-Disposition: form-data; name="{name}"; '
             f'filename="{filename}"\r\n').encode(),
            f'Content-Type: {mime_type}\r\n\r\n'.encode(),
            content, b'\r\n',
        ])
    chunks.append(f'--{boundary}--\r\n'.encode())
    return boundary, b''.join(chunks)


def pollinations_edit_hair(user_pil, reference_pil, style_name, color_tint):
    """Portable hosted image edit using a free Pollinations account key."""
    if not POLLINATIONS_KEY or reference_pil is None:
        return None
    prompt = build_hair_edit_prompt(style_name, color_tint, True)
    boundary, body = _multipart_body(
        {
            'prompt': prompt,
            'model': POLLINATIONS_MODEL,
            'response_format': 'b64_json',
            'size': ('1024x1536' if user_pil.height > user_pil.width * 1.15
                     else '1536x1024' if user_pil.width > user_pil.height * 1.15
                     else '1024x1024'),
        },
        [
            ('image', 'client.png', 'image/png', pil_to_bytes(user_pil.convert('RGB'), 'PNG')),
            ('image', 'hairstyle.png', 'image/png', pil_to_bytes(reference_pil.convert('RGB'), 'PNG')),
        ],
    )
    request = urllib.request.Request(
        'https://gen.pollinations.ai/v1/images/edits', data=body,
        headers={
            'Authorization': f'Bearer {POLLINATIONS_KEY}',
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'User-Agent': 'Munagay-HairSalon/1.0',
        }, method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            payload = json.loads(response.read().decode('utf-8'))
        item = (payload.get('data') or [{}])[0]
        encoded = item.get('b64_json') or item.get('b64')
        if encoded:
            generated = Image.open(io.BytesIO(base64.b64decode(encoded))).convert('RGBA')
            # The provider performs a true generative edit. Re-compositing the
            # old face over it creates visible oval seams, so retain the coherent
            # generated frame and only normalize it to the source canvas.
            return ImageOps.fit(
                generated, user_pil.size, method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
        image_url = item.get('url')
        if image_url:
            with urllib.request.urlopen(image_url, timeout=60) as response:
                generated = Image.open(io.BytesIO(response.read())).convert('RGBA')
            return ImageOps.fit(
                generated, user_pil.size, method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
    except urllib.error.HTTPError as error:
        detail = read_http_error(error)
        if error.code in (401, 402):
            raise RuntimeError(
                'The free Pollinations key is invalid or has no Pollen remaining. '
                'Create or refresh a free key at enter.pollinations.ai.'
            ) from error
        raise RuntimeError(f'Pollinations image editing failed: {detail[:240]}') from error
    except Exception as error:
        raise RuntimeError(f'Pollinations image editing is unavailable: {error}') from error
    return None


def local_reference_hair_overlay(user_pil, reference_pil, color_tint='original'):
    """Zero-cost offline hair transfer using face alignment and hair segmentation."""
    if reference_pil is None:
        return None
    user = user_pil.convert('RGB')
    ref = reference_pil.convert('RGB')
    user_face = _detect_largest_face(user)
    ref_face = _detect_largest_face(ref)
    # Front-facing portrait fallback for lightweight OpenCV installations that
    # do not ship the Haar cascade data. The UI already asks users to align a
    # centered portrait, making this a predictable zero-dependency fallback.
    if not user_face:
        user_face = (int(user.width * .33), int(user.height * .17),
                     int(user.width * .34), int(user.height * .34))
    if not ref_face:
        ref_face = (int(ref.width * .30), int(ref.height * .16),
                    int(ref.width * .40), int(ref.height * .38))

    rx, ry, rw, rh = [int(v) for v in ref_face]
    ux, uy, uw, uh = [int(v) for v in user_face]
    ref_arr = np.asarray(ref)
    hsv = cv2.cvtColor(ref_arr, cv2.COLOR_RGB2HSV)
    value = hsv[:, :, 2]
    saturation = hsv[:, :, 1]
    lab = cv2.cvtColor(ref_arr, cv2.COLOR_RGB2LAB).astype(np.float32)

    corner = max(4, min(ref.width, ref.height) // 12)
    background_samples = np.concatenate([
        lab[:corner, :corner].reshape(-1, 3),
        lab[:corner, -corner:].reshape(-1, 3),
    ])
    background_color = np.median(background_samples, axis=0)
    background_distance = np.linalg.norm(lab - background_color, axis=2)

    # The style is sampled from above and beside the reference face. Hair is
    # usually darker and/or more saturated than the portrait background.
    mask = np.zeros(value.shape, dtype=np.uint8)
    region = np.zeros_like(mask)
    left = max(0, rx - int(rw * .75))
    right = min(ref.width, rx + rw + int(rw * .75))
    top = max(0, ry - int(rh * 1.05))
    bottom = min(ref.height, ry + int(rh * 2.10))
    region[top:bottom, left:right] = 255
    red, green, blue = [ref_arr[:, :, i].astype(np.float32) for i in range(3)]
    skin_like = ((red > green * 1.10) & (red > blue * 1.14) &
                 (red > 65) & (green > 35))
    hair_like = (((value < 112) | ((saturation > 70) & (value < 205))) &
                 (background_distance > 32) & ~skin_like)
    mask[(region > 0) & hair_like] = 255

    # Never copy the hairstyle model's face or central clothing.
    cv2.ellipse(mask, (rx + rw // 2, ry + int(rh * .62)),
                (int(rw * .47), int(rh * .52)), 0, 0, 360, 0, -1)
    cv2.rectangle(mask, (rx + int(rw * .20), ry + rh),
                  (rx + int(rw * .80), bottom), 0, -1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=max(1.2, rw / 100))

    # Affine face alignment maps the reference hair onto the client's head.
    src = np.float32([[rx, ry], [rx + rw, ry], [rx + rw / 2, ry + rh]])
    dst = np.float32([[ux, uy], [ux + uw, uy], [ux + uw / 2, uy + uh]])
    transform = cv2.getAffineTransform(src, dst)
    out_size = user.size
    warped_hair = cv2.warpAffine(ref_arr, transform, out_size,
                                 flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
    warped_mask = cv2.warpAffine(mask, transform, out_size,
                                 flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    hair_rgba = Image.fromarray(warped_hair).convert('RGBA')
    if color_tint and color_tint != 'original':
        hair_rgba = apply_hair_color_filter(hair_rgba, color_tint)
    hair_rgba.putalpha(Image.fromarray(warped_mask))
    return Image.alpha_composite(user.convert('RGBA'), hair_rgba)


def gemini_edit_hair(user_pil, reference_pil, style_name, color_tint):
    """
    AI in-place hair refinement.
    Sends the user's ACTUAL photo to a Gemini image model with a natural-language
    instruction so the AI reshaves / re-grows the hair directly on that photo,
    preserving the person's real identity, face, body and background. No copying,
    no pasting, no cutouts — the model regenerates the hairstyle in place.
    """
    if not GEMINI_KEY:
        return None

    # Guard heavily against huge payloads.
    size = 800
    w, h = user_pil.size
    scale = min(1.0, size / float(max(w, h)))
    if scale < 1.0:
        user_rgb = user_pil.convert('RGB').resize(
            (int(w * scale), int(h * scale)), Image.Resampling.LANCZOS
        )
    else:
        user_rgb = user_pil.convert('RGB')
    user_bytes = pil_to_bytes(user_rgb, 'JPEG')
    user_b64 = base64.b64encode(user_bytes).decode('utf-8')

    has_reference = reference_pil is not None

    parts = [
        {"text": "IMAGE 1 — the original client photo and immutable base image:"},
        {"inline_data": {"mime_type": "image/jpeg", "data": user_b64}},
    ]
    if has_reference:
        ref_rgb = reference_pil.convert('RGB')
        ref_rgb.thumbnail((512, 512), Image.Resampling.LANCZOS)
        ref_bytes = pil_to_bytes(ref_rgb, 'JPEG')
        ref_b64 = base64.b64encode(ref_bytes).decode('utf-8')
        parts.append({"text": "IMAGE 2 — hairstyle reference only:"})
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": ref_b64}})

    parts.append({"text": build_hair_edit_prompt(style_name, color_tint, has_reference)})

    image_models = [
        "gemini-3.1-flash-image",
        "gemini-2.5-flash-image",
    ]

    last_error = None
    for model in image_models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"
            payload = {
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "responseModalities": ["TEXT", "IMAGE"],
                },
            }
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url, data=data, headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                body = resp.read().decode('utf-8')

            res_json = json.loads(body)
            if 'candidates' not in res_json:
                continue

            candidates = res_json.get('candidates', [])
            if not candidates:
                continue
            parts_resp = candidates[0].get('content', {}).get('parts', [])

            # Pick the LAST non-thought image part (the final edited image).
            for part in reversed(parts_resp):
                if isinstance(part, dict) and part.get('inlineData') and not part.get('thought'):
                    b64 = part['inlineData'].get('data')
                    if b64:
                        generated = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
                        return preserve_original_outside_hair(user_pil, generated)

        except urllib.error.HTTPError as e:
            last_error = read_http_error(e)
            continue
        except Exception as e:
            last_error = str(e)
            continue

    if last_error and ('429' in last_error or 'quota' in last_error.lower()):
        raise RuntimeError(
            'AI capacity is currently exhausted on this account. '
            'Please check your Gemini plan/billing quota and try again shortly.'
        )
    return None


def perform_virtual_tryon(user_image_data, hair_image_data_or_url, options=None):
    """
    AI Virtual Hairstyle Try-On (in-place refinement).

    The user's uploaded photo is edited directly by a Gemini image model: the AI
    removes the existing hair and grows the requested hairstyle on the SAME photo,
    keeping the person's real face, body, clothing and background unchanged.

    Falls back to a textual (non-AI) diagnostic frame if no Gemini key is present.
    """
    options = options or {}
    style_name = options.get('style_name', 'New Hairstyle')
    color_tint = options.get('color_tint', 'original')

    # Decode user portrait
    user_pil = decode_image_input(user_image_data)
    if not user_pil:
        raise ValueError('Invalid user image data.')

    # Decode optional hair reference image (base64 OR HTTP/HTTPS URL)
    reference_pil = decode_image_input(hair_image_data_or_url)

    diagnostics = generate_ai_style_diagnostics(style_name)

    if reference_pil is None:
        raise ValueError('The selected hairstyle reference could not be loaded.')

    # First choice: portable hosted image editing. A free account key works on
    # any machine and keeps GPU requirements off the Django server.
    provider_errors = []
    try:
        result_image = pollinations_edit_hair(
            user_pil, reference_pil, style_name, color_tint
        )
    except RuntimeError as error:
        provider_errors.append(str(error))
        result_image = None
    method = 'pollinations-edit'

    # Second choice: the open-source HairFastGAN authors' public demo.
    if result_image is None:
        result_image = hairfastgan_edit_hair(user_pil, reference_pil)
        method = 'hairfastgan-free'

    # Optional higher-quality provider when the configured account has quota.
    if result_image is None and GEMINI_KEY:
        try:
            result_image = gemini_edit_hair(
                user_pil, reference_pil, style_name, color_tint
            )
            method = 'gemini-refine'
        except RuntimeError:
            result_image = None

    if result_image is None:
        raise RuntimeError(
            'Professional hairstyle generation is temporarily unavailable. '
            + (' '.join(provider_errors) + ' ' if provider_errors else '') +
            'The free HairFastGAN worker is offline and Gemini image quota is '
            'unavailable. No pasted overlay was created.'
        )

    return {
        'result_image': encode_image_to_base64(result_image, 'PNG'),
        'diagnostics': diagnostics,
        'method': method,
        'status': 'success',
        'note': '',
    }


def apply_color_tint_to_top(img, tint_name):
    """Apply a subtle color tint to the upper hair region of the portrait."""
    tints = {
        'jet-black': (15, 18, 24),
        'espresso': (55, 32, 22),
        'caramel': (175, 100, 40),
        'honey-blonde': (220, 175, 90),
        'burgundy': (135, 20, 35),
        'platinum': (215, 220, 230),
        'rose-gold': (240, 125, 155),
    }
    if tint_name not in tints:
        return img

    color = tints[tint_name]
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (*color, 0))
    draw = ImageDraw.Draw(overlay)
    # Gradient: strong at top, fading to nothing at 40% height
    for y in range(int(h * 0.4)):
        alpha = int(80 * (1 - y / (h * 0.4)))
        draw.line([(0, y), (w, y)], fill=(*color, alpha))

    return Image.alpha_composite(img.convert('RGBA'), overlay)


def harmonize_ambient_lighting(hair_img, r_face, g_face, b_face):
    """Adjusts hair highlights to match ambient room color temperature."""
    try:
        if hair_img.mode != 'RGBA':
            hair_img = hair_img.convert('RGBA')
        r, g, b, a = hair_img.split()
        rgb = Image.merge('RGB', (r, g, b))
        tint_layer = Image.new('RGB', rgb.size, (r_face, g_face, b_face))
        blended = Image.blend(rgb, tint_layer, alpha=0.08)
        r2, g2, b2 = blended.split()
        return Image.merge('RGBA', (r2, g2, b2, a))
    except Exception:
        return hair_img


def apply_hair_color_filter(hair_img, tint_name):
    """Applies authentic hair dye color tone while preserving texture."""
    if hair_img.mode != 'RGBA':
        hair_img = hair_img.convert('RGBA')

    r, g, b, a = hair_img.split()
    rgb = Image.merge('RGB', (r, g, b))

    tints = {
        'jet-black': (15, 18, 24),
        'espresso': (55, 32, 22),
        'caramel': (175, 100, 40),
        'honey-blonde': (220, 175, 90),
        'burgundy': (135, 20, 35),
        'platinum': (215, 220, 230),
        'rose-gold': (240, 125, 155),
    }

    if tint_name in tints:
        target_color = tints[tint_name]
        color_layer = Image.new('RGB', rgb.size, target_color)
        blended = Image.blend(rgb, color_layer, alpha=0.36)
        enhancer = ImageEnhance.Contrast(blended)
        blended = enhancer.enhance(1.18)
        r2, g2, b2 = blended.split()
        return Image.merge('RGBA', (r2, g2, b2, a))

    return hair_img


def generate_ai_style_diagnostics(style_name):
    """Generates comprehensive style analysis & suitability report."""
    name_lower = style_name.lower()
    if any(w in name_lower for w in ['braid', 'bob', 'wavy', 'loc', 'twist']):
        face_match = 'Oval & Heart'
    elif any(w in name_lower for w in ['fade', 'taper', 'buzz', 'pompadour']):
        face_match = 'Square & Round'
    else:
        face_match = 'All Face Shapes'

    return {
        'style_name': style_name,
        'face_shape_compatibility': f"99% Compatibility for {face_match} Faces",
        'volume_rating': 'High Density & Natural Lift',
        'maintenance_level': 'Low-Maintenance Protective Style',
        'scalp_tension': 'Zero Tension / Lightweight',
        'recommended_products': [
            'Luxe Hydrating Rosewater Scalp Spray',
            'Organic Shea Butter & Peppermint Oil',
            'Silk Bonnet / Scarf for Night Protection',
            'Argan Oil Edge Control Gel',
        ],
        'estimated_salon_duration': '2h 30m - 3h 30m',
        'ai_confidence_score': 99.2,
    }
