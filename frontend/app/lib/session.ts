
export const getSessionId = () => {

  if (typeof window === "undefined") return ""; 
  
  let id = localStorage.getItem("replex_session_id");
  
  if (!id) {
    // Generate a random, unique string for the new user
    id = crypto.randomUUID(); 
    localStorage.setItem("replex_session_id", id);
  }
  
  return id;
};