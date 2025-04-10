from flask import Blueprint, request, jsonify
from agents.scholar_agent.agent import ScholarAgent
from typing import Dict, Any, Optional

library_bp = Blueprint('library', __name__)
scholar_agent = ScholarAgent()

@library_bp.route('/api/library/files', methods=['POST'])
def get_user_files() -> Dict[str, Any]:
    """Get all files in a user's library."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400

        # Get files from the database
        files = scholar_agent.get_user_library_files(user_id)
        
        return jsonify({
            'status': 'success',
            'files': files
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@library_bp.route('/api/library/files/<file_id>', methods=['POST'])
def get_file_details(file_id: str) -> Dict[str, Any]:
    """Get details of a specific file in the user's library."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400

        # Get file details from the database
        file_details = scholar_agent.get_file_details(user_id, file_id)
        
        if not file_details:
            return jsonify({
                'status': 'error',
                'message': 'File not found'
            }), 404
            
        return jsonify({
            'status': 'success',
            'file': file_details
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@library_bp.route('/api/library/files/<file_id>/delete', methods=['POST'])
def delete_file(file_id: str) -> Dict[str, Any]:
    """Delete a file from the user's library."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'User ID is required'
            }), 400

        # Delete the file from the database and S3
        success = scholar_agent.delete_file(user_id, file_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': 'Failed to delete file'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'File deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500 