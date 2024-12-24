import Groq from "groq-sdk";

export const groqMessage = async (diffString: string) => {
  const groq = new Groq({ apiKey: '' });
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Generate a commit message based on the following changes: ${diffString}`,
        },
      ],
      model: "llama3-8b-8192",
    });
  
    return { sucess: true, completion: completion };
  
    } catch (error) {
      return { sucess: false, error: error };
    }
};