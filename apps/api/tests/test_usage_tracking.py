"""Unit checks for concurrency-safe model token accounting."""
import unittest

from services.ai.usage_tracking import (
    begin_usage_tracking,
    mark_provider_attempt,
    record_provider_success,
    finish_usage_tracking,
)


class UsageTrackingTests(unittest.TestCase):
    def test_all_successful_calls_are_accumulated(self):
        token = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("gemini", "gemini-flash", {"inputTokens": 21, "outputTokens": 8})
        mark_provider_attempt()
        record_provider_success("groq", "llama-fast", {"inputTokens": 13, "outputTokens": 4})
        result = finish_usage_tracking(token)
        self.assertTrue(result.tokens_known)
        self.assertEqual(result.attempted_calls, 2)
        self.assertEqual(result.completed_calls, 2)
        self.assertEqual(result.prompt_tokens, 34)
        self.assertEqual(result.completion_tokens, 12)
        self.assertEqual(result.models, ["gemini/gemini-flash", "groq/llama-fast"])

    def test_no_model_calls_have_zero_usage(self):
        token = begin_usage_tracking()
        result = finish_usage_tracking(token)
        self.assertTrue(result.tokens_known)
        self.assertEqual(result.prompt_tokens, 0)
        self.assertEqual(result.completion_tokens, 0)

    def test_missing_usage_is_unknown_not_zero(self):
        token = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("gemini", "model", None)
        result = finish_usage_tracking(token)
        self.assertFalse(result.tokens_known)

    def test_failed_provider_attempt_prevents_fake_zero(self):
        token = begin_usage_tracking()
        mark_provider_attempt()  # timeout, usage may still be billable
        mark_provider_attempt()
        record_provider_success("groq", "model", {"inputTokens": 10, "outputTokens": 2})
        result = finish_usage_tracking(token)
        self.assertFalse(result.tokens_known)
        self.assertEqual(result.prompt_tokens, 10)
        self.assertEqual(result.completion_tokens, 2)

    def test_nested_contexts_are_isolated(self):
        outer = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("gemini", "outer", {"inputTokens": 9, "outputTokens": 1})
        inner = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("groq", "inner", {"inputTokens": 3, "outputTokens": 4})
        inner_result = finish_usage_tracking(inner)
        outer_result = finish_usage_tracking(outer)
        self.assertEqual(inner_result.prompt_tokens, 3)
        self.assertEqual(outer_result.prompt_tokens, 9)

    def test_model_label_fits_production_database_column(self):
        from services.ai.usage_tracking import format_model_label
        token = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("a-model-provider", "m" * 80, {"inputTokens": 1, "outputTokens": 1})
        mark_provider_attempt()
        record_provider_success("backup", "another-model", {"inputTokens": 2, "outputTokens": 3})
        usage = finish_usage_tracking(token)
        label = format_model_label(usage)
        self.assertLessEqual(len(label), 50)
        self.assertIn("+1 more", label)
        self.assertEqual(format_model_label(type(usage)()), "no-llm")

    def test_invalid_boolean_usage_is_not_accepted_as_token_count(self):
        token = begin_usage_tracking()
        mark_provider_attempt()
        record_provider_success("gemini", "model", {"inputTokens": True, "outputTokens": 0})
        result = finish_usage_tracking(token)
        self.assertFalse(result.tokens_known)


if __name__ == "__main__":
    unittest.main()
