import WitnessService from "../services/witnessService.js";

export async function requestWitness(req, res) {
  try {
    const requesterId = req?.user?.id;
    const { targetId } = req?.body;

    const request = await WitnessService.sendWitnessRequest(requesterId, targetId);
    res.status(201).json({
      success: true,
      message: "witness request sent",
      data: {
        requesterId: request._id,
      }
    });


  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export async function showWitnessRequests(req, res) {
  try {
    const userId = req?.user?.id;
    const requests = await WitnessService.getIncomingWitnessRequests(
      userId
    );
    
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export async function respondWitness (req, res, next) {
  try {
    const userId = req?.user?.id;
    const { requestId, action } = req?.body;


    

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "invalid action",
      })
    }
    const result = await WitnessService.respondingWitnessResquest({
      userId,
      requestId,
      action
    });
    res.status(200).json({
      success: true,
      data: result.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
    next(error)
  }
};

export async function getUserConnections (req, res)  {
  try {
    const userId = req?.user?.id;
    const connections = await WitnessService.getUserConnections(userId);
    
    res.status(200).json({
      success: true,
      data: connections,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};