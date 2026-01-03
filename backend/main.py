"""
AdversarialX Backend API

FastAPI server providing:
- REST endpoints for ML model predictions
- WebSocket streaming for real-time attack simulations
- Adversarial attack execution (FGSM, PGD, C&W, DeepFool)

Run with: uvicorn main:app --reload --port 8000
"""

import asyncio
import random
import time
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================
# MODELS
# ============================================

class AttackConfig(BaseModel):
    attack_type: str = "fgsm"
    epsilon: float = 0.03
    iterations: int = 10
    image: Optional[str] = None  # Base64 encoded image

class PredictionRequest(BaseModel):
    image: Optional[str] = None
    attack: Optional[AttackConfig] = None

class DefenseToggle(BaseModel):
    name: str
    enabled: bool

# ============================================
# IN-MEMORY STATE (Replace with Redis/DB in production)
# ============================================

defenses = [
    {"name": "Adversarial Training", "effectiveness": 78, "overhead": 2.3, "enabled": False},
    {"name": "Input Preprocessing", "effectiveness": 45, "overhead": 0.5, "enabled": True},
    {"name": "Defensive Distillation", "effectiveness": 62, "overhead": 1.8, "enabled": False},
    {"name": "Feature Squeezing", "effectiveness": 55, "overhead": 0.8, "enabled": True},
]

active_connections: list[WebSocket] = []

# ============================================
# MOCK ML FUNCTIONS (Replace with real models)
# ============================================

def generate_confidence(epsilon: float, defense_boost: float = 0) -> float:
    """Simulate model confidence degradation under attack."""
    base_confidence = 97.2
    degradation = epsilon * 800
    noise = (random.random() - 0.5) * 10
    confidence = base_confidence - degradation + noise + defense_boost
    return max(5, min(100, confidence))

def execute_attack(attack_type: str, epsilon: float) -> dict:
    """Simulate adversarial attack execution."""
    success_rates = {"fgsm": 0.85, "pgd": 0.92, "cw": 0.96, "deepfool": 0.89}
    base_rate = success_rates.get(attack_type, 0.85)

    # Calculate defense effectiveness
    defense_boost = sum(
        d["effectiveness"] * 0.1 for d in defenses if d["enabled"]
    )

    return {
        "success": random.random() < (base_rate + epsilon * 2 - defense_boost * 0.01),
        "confidence": generate_confidence(epsilon, defense_boost),
        "perturbation_norm": epsilon * 255,
        "iterations": 10 + int(random.random() * 30) if attack_type == "pgd" else 1,
        "attack_type": attack_type,
        "epsilon": epsilon,
        "timestamp": int(time.time() * 1000),
    }

def get_model_architecture() -> dict:
    """Return neural network architecture for visualization."""
    return {
        "layers": [
            {"type": "input", "units": 784, "activation": None},
            {"type": "conv2d", "units": 32, "activation": "relu", "kernel": 3},
            {"type": "conv2d", "units": 64, "activation": "relu", "kernel": 3},
            {"type": "maxpool", "units": 64, "pool_size": 2},
            {"type": "flatten", "units": 1600, "activation": None},
            {"type": "dense", "units": 256, "activation": "relu"},
            {"type": "dropout", "units": 256, "rate": 0.5},
            {"type": "dense", "units": 128, "activation": "relu"},
            {"type": "output", "units": 10, "activation": "softmax"},
        ],
        "total_params": 1234567,
        "trainable_params": 1234567,
    }

# ============================================
# LIFESPAN & APP SETUP
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AdversarialX API starting...")
    yield
    print("AdversarialX API shutting down...")

app = FastAPI(
    title="AdversarialX API",
    description="Adversarial ML Attack Simulation Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://ryanwelchtech.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# REST ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {"status": "online", "service": "AdversarialX API", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": int(time.time() * 1000)}

@app.post("/api/predict")
async def predict(request: PredictionRequest):
    """Get model prediction, optionally with adversarial perturbation."""
    epsilon = request.attack.epsilon if request.attack else 0
    confidence = generate_confidence(epsilon)

    # Simulate class predictions
    predictions = [
        {"label": "panda", "confidence": confidence},
        {"label": "gibbon", "confidence": max(0, 100 - confidence - random.random() * 5)},
        {"label": "macaque", "confidence": random.random() * 5},
    ]
    predictions.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "predictions": predictions,
        "is_adversarial": request.attack is not None,
        "timestamp": int(time.time() * 1000),
    }

@app.post("/api/attack")
async def attack(config: AttackConfig):
    """Execute adversarial attack on model."""
    result = execute_attack(config.attack_type, config.epsilon)
    return result

@app.get("/api/defenses")
async def get_defenses():
    """Get available defense mechanisms and their status."""
    return {"defenses": defenses}

@app.post("/api/defenses/toggle")
async def toggle_defense(toggle: DefenseToggle):
    """Toggle a defense mechanism on/off."""
    for defense in defenses:
        if defense["name"] == toggle.name:
            defense["enabled"] = toggle.enabled
            return {"success": True, "defense": defense}
    return {"success": False, "error": "Defense not found"}

@app.get("/api/model/architecture")
async def model_architecture():
    """Get neural network architecture for visualization."""
    return get_model_architecture()

# ============================================
# WEBSOCKET STREAMING
# ============================================

@app.websocket("/ws/attacks")
async def websocket_attacks(websocket: WebSocket):
    """Stream real-time attack simulation data."""
    await websocket.accept()
    active_connections.append(websocket)

    try:
        # Default attack config
        epsilon = 0.03
        attack_type = "fgsm"
        is_running = True

        async def send_updates():
            while is_running:
                # Calculate defense boost
                defense_boost = sum(
                    d["effectiveness"] * 0.05 for d in defenses if d["enabled"]
                )

                # Send confidence update
                confidence = generate_confidence(epsilon, defense_boost)
                await websocket.send_json({
                    "type": "confidence",
                    "data": {
                        "value": confidence,
                        "timestamp": int(time.time() * 1000),
                    }
                })

                # Occasionally send attack result
                if random.random() > 0.9:
                    result = execute_attack(attack_type, epsilon)
                    await websocket.send_json({
                        "type": "attack_result",
                        "data": result,
                    })

                await asyncio.sleep(0.1)  # 10 updates per second

        # Start sending updates in background
        update_task = asyncio.create_task(send_updates())

        # Listen for client messages
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "config":
                epsilon = data.get("epsilon", epsilon)
                attack_type = data.get("attack_type", attack_type)
            elif data.get("type") == "pause":
                is_running = False
            elif data.get("type") == "resume":
                is_running = True
                update_task = asyncio.create_task(send_updates())

    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

# ============================================
# PRODUCTION INTEGRATION EXAMPLES
# ============================================

"""
To integrate real ML models, replace the mock functions above:

1. TensorFlow/Keras:

   import tensorflow as tf
   model = tf.keras.models.load_model('adversarial_model.h5')

   def predict_real(image_data):
       img = tf.image.decode_image(base64.b64decode(image_data))
       img = tf.image.resize(img, [224, 224]) / 255.0
       predictions = model.predict(tf.expand_dims(img, 0))
       return predictions

2. PyTorch:

   import torch
   model = torch.load('adversarial_model.pth')
   model.eval()

   def predict_real(image_data):
       img = decode_image(image_data)
       with torch.no_grad():
           predictions = model(img.unsqueeze(0))
       return predictions

3. Adversarial Robustness Toolbox (ART):

   from art.attacks.evasion import FastGradientMethod
   from art.estimators.classification import TensorFlowV2Classifier

   classifier = TensorFlowV2Classifier(model=model, ...)
   attack = FastGradientMethod(estimator=classifier, eps=0.03)

   def execute_fgsm(image):
       adversarial = attack.generate(x=image)
       return adversarial
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
