from flask import Flask, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

class GameState:
    def __init__(self):
        self.high_scores = []
        self.current_game = None

game_manager = GameState()

@app.route('/submit_score', methods=['POST'])
def submit_score():
    score_data = request.json
    game_manager.high_scores.append(score_data)
    game_manager.high_scores.sort(key=lambda x: x['score'], reverse=True)
    game_manager.high_scores = game_manager.high_scores[:10]  # Keep top 10 scores
    return jsonify({"status": "success", "high_scores": game_manager.high_scores})

@app.route('/get_high_scores', methods=['GET'])
def get_high_scores():
    return jsonify(game_manager.high_scores)

@app.route('/generate_zombie_wave', methods=['GET'])
def generate_zombie_wave():
    zombie_wave = [
        {
            'id': random.randint(1000, 9999),
            'speed': random.uniform(1.0, 3.0),
            'health': random.randint(50, 200)
        } for _ in range(random.randint(5, 20))
    ]
    return jsonify(zombie_wave)

if __name__ == '__main__':
    app.run(debug=True, port=5000)