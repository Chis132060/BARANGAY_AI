from locust import HttpUser, task, between

class AIUser(HttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        # We would log in here and obtain a JWT to use in the headers
        self.headers = {"Authorization": "Bearer mock_valid_token"}
        
    @task(3)
    def query_health(self):
        query = """
        query {
          aiHealth {
            status
            primaryProvider
            activeProviders
          }
        }
        """
        self.client.post("/graphql", json={"query": query}, headers=self.headers, name="GraphQL Health")
        
    @task(1)
    def query_session(self):
        query = """
        query {
          aiSession(id: "test-session") {
            id
          }
        }
        """
        # A 400 or Error response might occur if the session doesn't exist, but it tests throughput
        with self.client.post("/graphql", json={"query": query}, headers=self.headers, catch_response=True, name="GraphQL Fetch Session") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed with {response.status_code}")
                
    @task(2)
    def simulate_ai_message(self):
        """Simulate sending an AI message through the GraphQL API mutation"""
        import uuid
        client_request_id = str(uuid.uuid4())
        
        query = f"""
        mutation {{
          sendAiMessage(input: {{sessionId: "test-session", message: "Load test message", clientRequestId: "{client_request_id}"}}) {{
            requestId
            answer
          }}
        }}
        """
        # In a real environment, this might time out or take a few seconds
        # Using catch_response to handle potential 500s or timeouts during load
        with self.client.post("/graphql", json={"query": query}, headers=self.headers, catch_response=True, name="GraphQL Send Message") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed AI Generation with {response.status_code}")

# Note: True WebSocket load testing in Locust requires a custom WebSocket client.
# For this script, we rely on the GraphQL POST mutations to stress the backend providers, DB, and RAG.
