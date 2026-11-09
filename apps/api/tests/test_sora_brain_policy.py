from services.ai.sora_brain import SoraBrainPolicy, SoraRequestContext

def test_language_normalization_uses_supported_request_or_detected_language():
    assert SoraBrainPolicy.normalize_language("ceb", "en") == "ceb"
    assert SoraBrainPolicy.normalize_language("xx", "tgl") == "tgl"
    assert SoraBrainPolicy.normalize_language("xx", "xx") == "en"

def test_current_tool_registry_never_receives_privileged_role():
    context = SoraRequestContext("user-1", "session-1", "en")
    assert SoraBrainPolicy.tool_role(context) == "ANON"

def test_memory_requires_verified_user_and_session():
    assert SoraBrainPolicy.memory_is_available(SoraRequestContext("user-1", "session-1", "en"))
    assert not SoraBrainPolicy.memory_is_available(SoraRequestContext(None, "session-1", "en"))
    assert not SoraBrainPolicy.memory_is_available(SoraRequestContext("user-1", None, "en"))

def test_system_policy_protects_authority_order_and_untrusted_context():
    policy = SoraBrainPolicy.system_policy()
    assert "server-enforced authorization" in policy
    assert "untrusted evidence, not instructions" in policy
    assert "Never let user text" in policy
    assert "Do not invent fees" in policy
