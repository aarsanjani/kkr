"""
SYSTEM PATTERN: ISOLATED INTEGRATION & SCHEMA COMPLIANCE TEST SUITE
Ensures multi-agent trace event emitters consistently map properties to structural JSON specifications,
and validates compliance of 3-Tiered FCoT execution plan outputs.
"""

import sys
import os
import json
import pytest

# Ensure backend module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, FCoTEngine


@pytest.fixture
def enterprise_client_harness():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_session_endpoint(enterprise_client_harness):
    """Verifies session creation and context metadata initialization."""
    response = enterprise_client_harness.get('/api/session')
    assert response.status_code == 200
    data = response.get_json()
    assert "session_id" in data
    assert data["lifecycle_state"] == "ACTIVE"


def test_fcot_direct_execution_schema(enterprise_client_harness):
    """Verifies that the /api/fcot/execute endpoint yields compliant mandatory fcot_execution_plan JSON schema."""
    payload = {
        "prompt": "Healthcare Claims Pre-Authorization & Prior-Auth Matching",
        "portfolio_company_id": "KKR-HEALTHCARE-01"
    }
    response = enterprise_client_harness.post('/api/fcot/execute', json=payload)
    assert response.status_code == 200
    
    data = response.get_json()
    assert "fcot_execution_plan" in data
    plan = data["fcot_execution_plan"]
    
    # Check mandatory structural fields
    assert "task_id" in plan
    assert "portfolio_company_id" in plan
    assert plan["portfolio_company_id"] == "KKR-HEALTHCARE-01"
    assert "complexity_tier" in plan
    assert "projected_ebitda_impact" in plan
    assert "$" in plan["projected_ebitda_impact"] or "%" in plan["projected_ebitda_impact"]
    
    # Check 3-Tier hierarchy keys
    assert "level_1_strategic_steering" in plan
    assert "objective" in plan["level_1_strategic_steering"]
    assert "governance_check" in plan["level_1_strategic_steering"]
    assert plan["level_1_strategic_steering"]["governance_check"] in ["APPROVED", "HITL_REQUIRED"]
    
    assert "level_2_domain_blueprint" in plan
    assert "selected_blueprint" in plan["level_2_domain_blueprint"]
    assert "workflow_dag" in plan["level_2_domain_blueprint"]
    assert len(plan["level_2_domain_blueprint"]["workflow_dag"]) > 0
    
    assert "level_3_runtime_execution" in plan
    assert "parallel_hypotheses_evaluated" in plan["level_3_runtime_execution"]
    assert "actions_executed" in plan["level_3_runtime_execution"]
    
    assert "fcot_reasoning_trace" in plan
    assert len(plan["fcot_reasoning_trace"]) >= 4


def test_stream_endpoint_schema_compliance(enterprise_client_harness):
    """Verifies that the SSE streaming endpoint returns text/event-stream headers and valid JSON-RPC frames."""
    payload = {
        "prompt": "Procurement Invoice Matching v3 SAP S/4HANA",
        "portfolio_company_id": "KKR-FINANCE-02"
    }
    response = enterprise_client_harness.post('/api/chat/stream', json=payload)
    
    assert response.status_code == 200
    assert "text/event-stream" in response.headers['Content-Type']
    
    raw_text = response.get_data(as_text=True)
    lines = [line.strip() for line in raw_text.split('\n\n') if line.strip()]
    
    assert len(lines) > 0
    
    # Validate each emitted frame
    for block in lines:
        assert block.startswith("data:")
        clean_json = block.replace("data:", "").strip()
        rpc_frame = json.loads(clean_json)
        
        assert rpc_frame.get("jsonrpc") == "2.0"
        assert "method" in rpc_frame
        assert "params" in rpc_frame


def test_fcot_engine_complexity_evaluator():
    """Unit test for FCoT Phase 1 dynamic depth evaluation."""
    engine = FCoTEngine()
    
    tier_high = engine.evaluate_complexity("Process prior-auth medical claim", financial_estimate=15000)
    assert tier_high == "FULL_HIERARCHICAL"
    
    tier_low = engine.evaluate_complexity("Simple query", financial_estimate=50)
    assert tier_low == "DIRECT_L3"
