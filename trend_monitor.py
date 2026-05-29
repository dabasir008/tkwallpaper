"""
壁纸趋势监控脚本
每天运行一次，自动搜集热门壁纸素材并上传到 R2 存储
"""

import json
import os
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import ssl
import io
import boto3
from botocore.config import Config as BotoConfig

# ===== 配置 =====
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPTS_DIR, "trend_data.json")
CONFIG_FILE = os.path.join(SCRIPTS_DIR, "config.json")

def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

CONFIG = load_config()

# R2 配置
R2_CFG = CONFIG.get("r2", {})
R2_PUBLIC_URL = R2_CFG.get("public_url", "")
R2_BUCKET = R2_CFG.get("bucket", "tkwallpaper")

# S3 客户端（兼容 R2）
s3 = boto3.client(
    "s3",
    endpoint_url=R2_CFG.get("endpoint", ""),
    aws_access_key_id=R2_CFG.get("access_key_id", ""),
    aws_secret_access_key=R2_CFG.get("secret_access_key", ""),
    config=BotoConfig(signature_version="s3v4"),
    region_name="auto",
)

# 热门壁纸关键词
TREND_KEYWORDS = [
    "anime wallpaper 4k phone",
    "japanese anime aesthetic wallpaper",
    "studio ghibli wallpaper phone",
    "nature wallpaper 4k phone",
    "aesthetic sunset wallpaper phone",
    "ocean waves wallpaper phone",
    "cyberpunk wallpaper 4k phone",
    "neon city wallpaper phone",
    "retrowave synthwave wallpaper phone",
    "minimalist wallpaper phone",
    "clean aesthetic wallpaper phone",
    "dark amoled wallpaper phone",
    "abstract gradient wallpaper phone",
    "geometric pattern wallpaper phone",
    "live wallpaper trending",
    "animated wallpaper phone",
    "particle effect wallpaper",
    "AI portrait art wallpaper",
    "AI anime filter wallpaper",
    "AI fantasy character wallpaper",
]

CATEGORIES = ["anime", "nature", "cyberpunk", "minimal", "abstract", "live", "ai-art"]


def search_pexels(keyword, count=10):
    """从 Pexels 搜索免费图片"""
    results = []
    pexels_key = CONFIG.get("pexels_api_key", "")
    if not pexels_key:
        return results

    url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(keyword)}&per_page={count}&orientation=portrait"
    headers = {
        "Authorization": pexels_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    req = urllib.request.Request(url, headers=headers)

    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            for photo in data.get("photos", []):
                results.append({
                    "src": photo["src"]["large"],
                    "label": keyword.replace("-", " ").title(),
                    "photographer": photo["photographer"],
                })
    except Exception as e:
        print(f"  Pexels 搜索 '{keyword}' 失败: {e}")
    return results


def upload_to_r2(image_url, filename):
    """下载图片并上传到 R2，返回公开 URL"""
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(image_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            image_data = resp.read()

        # 用 MD5 做文件名，避免重复
        file_hash = hashlib.md5(image_data).hexdigest()
        ext = ".jpg"
        key = f"wallpapers/{file_hash}{ext}"

        # 检查是否已存在
        try:
            s3.head_object(Bucket=R2_BUCKET, Key=key)
            print(f"    (已存在于 R2，跳过上传)")
            return f"{R2_PUBLIC_URL}/{key}"
        except Exception:
            pass

        # 上传
        s3.upload_fileobj(
            io.BytesIO(image_data),
            R2_BUCKET,
            key,
            ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "public, max-age=2592000"},
        )
        print(f"    已上传到 R2: {key}")
        return f"{R2_PUBLIC_URL}/{key}"
    except Exception as e:
        print(f"    上传失败: {e}")
        return image_url  # 回退到原始链接


def collect_trends():
    """汇总趋势数据"""
    output = {
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "categories": {},
        "top_keywords": [],
        "suggested_collections": [],
        "r2_images": [],
    }

    for cat in CATEGORIES:
        output["categories"][cat] = {"keywords": [], "images": []}

    print("开始搜集壁纸素材...\n")
    uploaded_count = 0

    for kw in TREND_KEYWORDS:
        print(f"  搜索: {kw}")
        pexel_imgs = search_pexels(kw, count=5)

        for img in pexel_imgs:
            # 上传每张图片到 R2
            r2_url = upload_to_r2(img["src"], "")
            img["r2_url"] = r2_url
            output["r2_images"].append({
                "r2_url": r2_url,
                "label": img["label"],
                "category": kw,
                "photographer": img.get("photographer", ""),
            })
            uploaded_count += 1

        print(f"    找到 {len(pexel_imgs)} 张 (Pexels)")

        for cat in CATEGORIES:
            if cat in kw or cat.replace("-", " ") in kw:
                output["categories"][cat]["keywords"].append(kw)

        time.sleep(0.5)

    output["total_uploaded"] = uploaded_count

    # 建议合集
    output["suggested_collections"] = [
        {"name": "Trending This Week", "keywords": TREND_KEYWORDS[:5]},
        {"name": "Phone Wallpapers", "keywords": [k for k in TREND_KEYWORDS if "phone" in k][:5]},
        {"name": "Live & Motion", "keywords": [k for k in TREND_KEYWORDS if "live" in k or "animated" in k][:5]},
        {"name": "AI Art Style", "keywords": [k for k in TREND_KEYWORDS if "AI" in k or "ai" in k][:5]},
    ]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n完成! 共上传 {uploaded_count} 张壁纸到 R2")
    print(f"公开访问地址: {R2_PUBLIC_URL}")
    return output


if __name__ == "__main__":
    collect_trends()
