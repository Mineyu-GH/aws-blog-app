from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import boto3
import uuid
from datetime import datetime
import os
from botocore.exceptions import ClientError

app = Flask(__name__)
CORS(app)

# DynamoDB設定
dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'ap-northeast-3'))
table = dynamodb.Table(os.getenv('DYNAMODB_TABLE_NAME', 'blog_posts'))

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/app.js')
def serve_js():
    return send_from_directory('.', 'app.js')

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

# 記事一覧取得
@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        response = table.scan()
        posts = response.get('Items', [])
        posts.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return jsonify(posts)
    except:
        return jsonify({'error': 'Failed to fetch posts'}), 500

# 新規記事作成
@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'error': 'Title and content are required'}), 400

    post_item = {
        'id': str(uuid.uuid4()),
        'title': data['title'].strip(),
        'content': data['content'].strip(),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    try:
        table.put_item(Item=post_item)
        return jsonify(post_item), 201
    except:
        return jsonify({'error': 'Failed to create post'}), 500

# 個別記事取得
@app.route('/api/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    try:
        response = table.get_item(Key={'id': post_id})
        if 'Item' not in response:
            return jsonify({'error': 'Post not found'}), 404
        return jsonify(response['Item'])
    except:
        return jsonify({'error': 'Failed to fetch post'}), 500

# 記事更新
@app.route('/api/posts/<post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'error': 'Title and content are required'}), 400

    try:
        table.update_item(
            Key={'id': post_id},
            UpdateExpression='SET title = :title, content = :content, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':title': data['title'].strip(),
                ':content': data['content'].strip(),
                ':updated_at': datetime.now().isoformat()
            }
        )
        
        response = table.get_item(Key={'id': post_id})
        return jsonify(response['Item'])
    except:
        return jsonify({'error': 'Failed to update post'}), 500

# 記事削除
@app.route('/api/posts/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        table.delete_item(Key={'id': post_id})
        return jsonify({'message': 'Post deleted successfully'})
    except:
        return jsonify({'error': 'Failed to delete post'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)