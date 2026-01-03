"""
AdversarialX Backend API

FastAPI server providing:
- REST endpoints for ML model predictions
- WebSocket streaming for real-time attack simulations
- Adversarial attack execution (FGSM, PGD, C&W, DeepFool)

Optimized for low latency and Apple UX principles.

Run with: uvicorn main:app --reload --port 8000
"""

import asyncio
import random
import time
from typing import Optional
from contextlib import asynccontextmanager
from functools import lru_cache
from collections import deque

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from starlette.responses import JSONResponse

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
connection_configs: dict[int, dict] = {}

# Performance: Pre-computed values
_SUCCESS_RATES = {"fgsm": 0.85, "pgd": 0.92, "cw": 0.96, "deepfool": 0.89}
_BASE_CONFIDENCE = 97.2

@lru_cache(maxsize=1)
def get_defense_boost_cached() -> float:
    """Cached defense boost calculation for performance."""
    return sum(d["effectiveness"] * 0.1 for d in defenses if d["enabled"])

# ============================================
# MOCK ML FUNCTIONS (Replace with real models)
# ============================================

def generate_confidence(epsilon: float, defense_boost: float = 0) -> float:
    """Simulate model confidence degradation under attack."""
    degradation = epsilon * 800
    noise = (random.random() - 0.5) * 10
    confidence = _BASE_CONFIDENCE - degradation + noise + defense_boost
    return max(5, min(100, confidence))

def execute_attack(attack_type: str, epsilon: float) -> dict:
    """Simulate adversarial attack execution."""
    base_rate = _SUCCESS_RATES.get(attack_type, 0.85)
    defense_boost = get_defense_boost_cached()

    return {
        "success": random.random() < (base_rate + epsilon * 2 - defense_boost * 0.01),
        "confidence": generate_confidence(epsilon, defense_boost),
        "perturbation_norm": epsilon * 255,
        "iterations": 10 + int(random.random() * 30) if attack_type == "pgd" else 1,
        "attack_type": attack_type,
        "epsilon": epsilon,
        "timestamp": int(time.time() * 1000),
    }

@lru_cache(maxsize=1)
def get_model_architecture() -> dict:
    """Return neural network architecture for visualization (cached)."""
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
    docs_url=None,
    redoc_url=None,
)

# Performance: GZip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS for frontend (production + development)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://ryanwelchtech.github.io",
    "https://adversarial-x.vercel.app",
    "https://adversarial-x*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ============================================
# REST ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {"status": "online", "service": "AdversarialX API", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return JSONResponse(
        content={"status": "healthy", "timestamp": int(time.time() * 1000)},
        headers={"Cache-Control": "no-cache"}
    )

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
    return JSONResponse(
        content={"defenses": defenses},
        headers={"Cache-Control": "max-age=60"}
    )

@app.post("/api/defenses/toggle")
async def toggle_defense(toggle: DefenseToggle):
    """Toggle a defense mechanism on/off."""
    for defense in defenses:
        if defense["name"] == toggle.name:
            defense["enabled"] = toggle.enabled
            get_defense_boost_cached.cache_clear()
            return JSONResponse(
                content={"success": True, "defense": defense},
                headers={"Cache-Control": "no-cache"}
            )
    return JSONResponse(
        content={"success": False, "error": "Defense not found"},
        status_code=404
    )

@app.get("/api/model/architecture")
async def model_architecture():
    """Get neural network architecture for visualization."""
    return get_model_architecture()

# ============================================
# WEBSOCKET STREAMING (Optimized for Low Latency)
# ============================================

@app.websocket("/ws/attacks")
async def websocket_attacks(websocket: WebSocket):
    """Stream real-time attack simulation data with optimized latency."""
    await websocket.accept()
    active_connections.append(websocket)

    conn_id = id(websocket)
    connection_configs[conn_id] = {"epsilon": 0.03, "attack_type": "fgsm", "is_running": True}

    try:
        async def send_updates():
            while connection_configs[conn_id]["is_running"]:
                defense_boost = get_defense_boost_cached() * 0.5
                confidence = generate_confidence(
                    connection_configs[conn_id]["epsilon"],
                    defense_boost
                )

                try:
                    await websocket.send_json({
                        "type": "confidence",
                        "data": {"value": confidence, "timestamp": int(time.time() * 1000)},
                    })

                    if random.random() > 0.9:
                        result = execute_attack(
                            connection_configs[conn_id]["attack_type"],
                            connection_configs[conn_id]["epsilon"]
                        )
                        await websocket.send_json({
                            "type": "attack_result",
                            "data": result,
                        })
                except Exception:
                    break

                await asyncio.sleep(0.05)

        update_task = asyncio.create_task(send_updates())

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=1.0)
                config = connection_configs[conn_id]

                if data.get("type") == "config":
                    config["epsilon"] = data.get("epsilon", config["epsilon"])
                    config["attack_type"] = data.get("attack_type", config["attack_type"])
                elif data.get("type") == "pause":
                    config["is_running"] = False
                elif data.get("type") == "resume":
                    config["is_running"] = True
            except asyncio.TimeoutError:
                continue

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        connection_configs.pop(conn_id, None)

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
