import boto3
import json
from botocore.exceptions import ClientError

def createDynamodbTable():
    dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-3')
    table_name = 'blog_posts'
    
    try:
        # テーブル存在確認
        existing_table = dynamodb.Table(table_name)
        existing_table.load()
        print(f"テーブル '{table_name}' は既に存在します。")
        return existing_table
    except ClientError as e:
        if e.response['Error']['Code'] != 'ResourceNotFoundException':
            print(f"エラー: {e}")
            return None
    
    # テーブル作成
    try:
        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        table.wait_until_exists()
        print(f"テーブル '{table_name}' が作成されました。")
        return table
        
    except ClientError as e:
        print(f"テーブル作成エラー: {e}")
        return None

def main():
    table = createDynamodbTable()
    
    if table:
        print("セットアップ完了！")
    else:
        print("セットアップ中にエラーが発生しました。")

if __name__ == "__main__":
    main()