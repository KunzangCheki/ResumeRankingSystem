from flask import Flask, render_template, request, jsonify
import joblib
import os

app = Flask(__name__)

# Load the Logistic Regression model on startup
model_path = os.path.join(os.getcwd(), 'Logistic Regression_best_model.pkl')
model = joblib.load(model_path)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/index')
def profession():
    selected = request.args.get('profession')
    return render_template('index.html', profession=selected)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    # Assuming input data is sent as JSON with feature values, e.g., {"features": [val1, val2, ...]}
    features = data.get('features')
    
    if not features:
        return jsonify({"error": "No features provided"}), 400
    
    # Convert to 2D array for sklearn predict
    prediction = model.predict([features])
    predicted_label = prediction[0]
    
    return jsonify({"prediction": str(predicted_label)})

if __name__ == '__main__':
    app.run(debug=True)
