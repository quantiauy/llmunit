export default {
  agent_basic_tool: async (args: any) => {
    console.log(`Executing mock agent_basic_tool with args:`, args);
    return JSON.stringify({
      status: "success",
      message: "Tool executed successfully",
      received_query: args.query
    });
  }
}
