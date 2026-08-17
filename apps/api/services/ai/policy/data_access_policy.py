from typing import List

class DataAccessPolicy:
    """
    Defines what types of data the current intent/session is authorized to access.
    """
    
    @staticmethod
    def get_allowed_data_domains(user_role: str = "ANON") -> List[str]:
        """
        Returns the data domains a user can query.
        """
        # By default, public info and public services are allowed.
        base_domains = ["PUBLIC_KNOWLEDGE", "SERVICES", "OFFICIALS"]
        
        if user_role == "RESIDENT":
            base_domains.extend(["PERSONAL_REQUESTS", "BARANGAY_CLEARANCE"])
            
        if user_role == "ADMIN":
            base_domains.extend(["ALL_RECORDS", "SYSTEM_HEALTH"])
            
        return base_domains

    @staticmethod
    def can_access_tool(tool_domain: str, user_role: str = "ANON") -> bool:
        return tool_domain in DataAccessPolicy.get_allowed_data_domains(user_role)
