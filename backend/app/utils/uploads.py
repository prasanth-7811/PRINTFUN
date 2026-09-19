import os
import uuid
from flask import current_app
from werkzeug.utils import secure_filename
from PIL import Image


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file, subfolder='designs'):
    if not allowed_file(file.filename):
        raise ValueError('File type not allowed. Use PNG, JPG, or JPEG.')

    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Validate it's a real image
    try:
        with Image.open(filepath) as img:
            width, height = img.size
    except Exception:
        os.remove(filepath)
        raise ValueError('Invalid image file.')

    if current_app.config.get('USE_S3'):
        url = upload_to_s3(filepath, f"{subfolder}/{filename}")
        os.remove(filepath)
        return url, width, height

    return f"/uploads/{subfolder}/{filename}", width, height


def upload_to_s3(filepath, key):
    import boto3
    s3 = boto3.client(
        's3',
        aws_access_key_id=current_app.config['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=current_app.config['AWS_SECRET_ACCESS_KEY'],
        region_name=current_app.config['AWS_REGION'],
    )
    bucket = current_app.config['AWS_S3_BUCKET']
    s3.upload_file(filepath, bucket, key, ExtraArgs={'ACL': 'public-read'})
    return f"https://{bucket}.s3.{current_app.config['AWS_REGION']}.amazonaws.com/{key}"
