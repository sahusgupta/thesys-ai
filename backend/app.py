from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# API Routes
@app.route('/api/library/files', methods=['POST'])
def get_user_files():
    # Mock data for testing
    return jsonify({
        'status': 'success',
        'files': [
            {
                'id': '1',
                'file_name': 'Sample Document.pdf',
                'file_type': 'application/pdf',
                'created_at': '2024-03-20T10:00:00Z',
                'url': '/sample.pdf'
            },
            {
                'id': '2',
                'file_name': 'Research Paper.docx',
                'file_type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'created_at': '2024-03-19T15:30:00Z',
                'url': '/sample.docx'
            }
        ]
    })

@app.route('/api/library/files/<file_id>', methods=['POST'])
def get_file_details(file_id):
    # Mock data for testing
    return jsonify({
        'status': 'success',
        'file': {
            'id': file_id,
            'file_name': 'Sample Document.pdf',
            'file_type': 'application/pdf',
            'created_at': '2024-03-20T10:00:00Z',
            'url': '/sample.pdf',
            'content': 'This is a sample file content for preview.'
        }
    })

@app.route('/api/library/files/<file_id>/delete', methods=['POST'])
def delete_file(file_id):
    return jsonify({
        'status': 'success',
        'message': 'File deleted successfully'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 