from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import boto3
import uuid
from datetime import datetime
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

AWS_REGION = os.getenv('AWS_REGION', 'ap-northeast-3')
DYNAMODB_TABLE_NAME = os.getenv('DYNAMODB_TABLE_NAME', 'blog_posts')

try:
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    

    table.load()
    print(f"テーブルステータス: {table.table_status}")
    
except Exception as e:
    print(f"dynamodb接続エラー: {e}")
    dynamodb = None
    table = None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/app.js')
def serve_js():
    return send_from_directory('.', 'app.js')

@app.route('/health')
def health_check():
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'dynamodb_connected': table is not None
    }
    
    if table:
        try:
            table.load()
            health_status['dynamodb_status'] = table.table_status
        except Exception as e:
            health_status['dynamodb_error'] = str(e)
            health_status['dynamodb_connected'] = False
    
    return jsonify(health_status)


@app.route('/api/posts', methods=['GET'])
def get_posts():
    
    if not table:
        error_msg = 'DynamoDB connection failed'
        print(f"エラー：{error_msg}")
        return jsonify({'error': error_msg}), 500

    try:
        response = table.scan()
        posts = response.get('Items', [])
        
        posts.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        for post in posts:
            print(f"   - {post.get('title', 'タイトルなし')} (ID: {post.get('id', 'IDなし')})")
        
        return jsonify(posts)
        
    except ClientError as e:
        error_msg = f"DynamoDB読み込みエラー: {e}"
        print(f"{error_msg}")
        return jsonify({'error': 'Failed to fetch posts'}), 500
    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        print(f"{error_msg}")
        return jsonify({'error': 'Failed to fetch posts'}), 500

@app.route('/api/posts', methods=['POST'])
def create_post():
    
    if not table:
        error_msg = 'DynamoDB connection failed'
        print(f"{error_msg}")
        return jsonify({'error': error_msg}), 500

    try:
        data = request.get_json()
        print(f"受信データ: {data}")
    except Exception as e:
        error_msg = f"Invalid JSON data: {e}"
        print(f"{error_msg}")
        return jsonify({'error': 'Invalid JSON data'}), 400
    
    if not data:
        error_msg = 'No data provided'
        print(f"{error_msg}")
        return jsonify({'error': 'No data provided'}), 400
        
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title or not content:
        error_msg = 'Title and content are required'
        print(f"{error_msg}")
        return jsonify({'error': error_msg}), 400

    post_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    post_item = {
        'id': post_id,
        'title': title,
        'content': content,
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    if data.get('image_url'):
        post_item['image_url'] = data['image_url'].strip()

    try:
        table.put_item(Item=post_item)
        print(f"記事作成成功: ID={post_id}, タイトル='{title}'")
        return jsonify(post_item), 201
        
    except ClientError as e:
        error_msg = f"DynamoDB put_item error: {e}"
        print(f"{error_msg}")
        return jsonify({'error': 'Failed to create post'}), 500
    except Exception as e:
        error_msg = f"Unexpected error during post creation: {e}"
        print(f"{error_msg}")
        return jsonify({'error': 'Failed to create post'}), 500

@app.route('/api/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    print(f"記事ID={post_id}")
    
    if not table:
        return jsonify({'error': 'DynamoDB connection failed'}), 500

    try:
        response = table.get_item(Key={'id': post_id})
        
        if 'Item' not in response:
            print(f"記事が見つかりません: ID={post_id}")
            return jsonify({'error': 'Post not found'}), 404
            
        post = response['Item']
        print(f"記事取得成功: {post.get('title', 'タイトルなし')}")
        return jsonify(post)
        
    except ClientError as e:
        print(f"DynamoDB get error: {e}")
        return jsonify({'error': 'Failed to fetch post'}), 500

if __name__ == '__main__':
    print(f"DynamoDBテーブル: {DYNAMODB_TABLE_NAME}")
    print(f"DynamoDB接続状態: {'成功' if table else '失敗'}")
    print()
    
    app.run(host='0.0.0.0', port=5001, debug=True)