import unittest

from services.ai.embeddings.providers.local import LocalEmbeddingProvider
from services.ai.retrieval.reranker import CrossEncoderReranker


class LazyModelInitializationTests(unittest.TestCase):
    def test_local_embedding_provider_does_not_load_model_during_import_or_construction(self):
        provider = LocalEmbeddingProvider()
        self.assertIsNone(provider._client)
        self.assertFalse(provider._load_attempted)

    def test_reranker_does_not_download_model_during_import_or_construction(self):
        reranker = CrossEncoderReranker()
        self.assertIsNone(reranker.model)
        self.assertFalse(reranker._load_attempted)


if __name__ == "__main__":
    unittest.main()
