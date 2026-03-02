const express = require("express");
const router = express.Router();
const { Connection, JobSeekerProfile, User } = require("../models");
const { auth, authorize } = require("../middleware");

/**
 * @swagger
 * /api/connections:
 *   get:
 *     summary: Get all connections for the logged-in user
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         description: Filter by connection status
 *     responses:
 *       200:
 *         description: List of connections
 */
router.get("/", auth, authorize("seeker"), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    };

    if (status) {
      query.status = status;
    }

    const connections = await Connection.find(query)
      .populate("requester", "name email")
      .populate("recipient", "name email")
      .sort({ createdAt: -1 });

    // Get profile information for each connected user
    const connectionsWithProfiles = await Promise.all(
      connections.map(async (conn) => {
        const otherId =
          conn.requester._id.toString() === req.user._id.toString()
            ? conn.recipient._id
            : conn.requester._id;

        const profile = await JobSeekerProfile.findOne({ user: otherId }).select(
          "fullName headline profilePicture location"
        );

        return {
          ...conn.toObject(),
          otherUser: otherId.toString() === conn.requester._id.toString() ? conn.requester : conn.recipient,
          otherProfile: profile,
        };
      })
    );

    res.json(connectionsWithProfiles);
  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/request:
 *   post:
 *     summary: Send a connection request
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *             properties:
 *               recipientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Connection request sent
 *       400:
 *         description: Bad request
 */
router.post("/request", auth, authorize("seeker"), async (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot connect with yourself" });
    }

    // Check if recipient exists and is a seeker
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    if (recipient.role !== "seeker") {
      return res.status(400).json({ message: "Can only connect with other job seekers" });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });

    if (existingConnection) {
      if (existingConnection.status === "pending") {
        return res.status(400).json({ message: "Connection request already sent" });
      } else if (existingConnection.status === "accepted") {
        return res.status(400).json({ message: "Already connected" });
      } else {
        // If rejected, allow to send again
        existingConnection.status = "pending";
        existingConnection.requester = req.user._id;
        existingConnection.recipient = recipientId;
        await existingConnection.save();
        return res.json({ message: "Connection request sent", connection: existingConnection });
      }
    }

    // Create new connection request
    const connection = new Connection({
      requester: req.user._id,
      recipient: recipientId,
      status: "pending",
    });

    await connection.save();

    res.status(201).json({ message: "Connection request sent", connection });
  } catch (error) {
    console.error("Send connection request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/{id}/accept:
 *   put:
 *     summary: Accept a connection request
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connection accepted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Connection not found
 */
router.put("/:id/accept", auth, authorize("seeker"), async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to accept this connection" });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({ message: "Connection request is not pending" });
    }

    connection.status = "accepted";
    await connection.save();

    res.json({ message: "Connection accepted", connection });
  } catch (error) {
    console.error("Accept connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/{id}/reject:
 *   put:
 *     summary: Reject a connection request
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connection rejected
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Connection not found
 */
router.put("/:id/reject", auth, authorize("seeker"), async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to reject this connection" });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({ message: "Connection request is not pending" });
    }

    connection.status = "rejected";
    await connection.save();

    res.json({ message: "Connection rejected", connection });
  } catch (error) {
    console.error("Reject connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/{id}:
 *   delete:
 *     summary: Remove a connection
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Connection ID
 *     responses:
 *       200:
 *         description: Connection removed
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Connection not found
 */
router.delete("/:id", auth, authorize("seeker"), async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    const isRequester = connection.requester.toString() === req.user._id.toString();
    const isRecipient = connection.recipient.toString() === req.user._id.toString();

    if (!isRequester && !isRecipient) {
      return res.status(403).json({ message: "Not authorized to remove this connection" });
    }

    await Connection.deleteOne({ _id: req.params.id });

    res.json({ message: "Connection removed" });
  } catch (error) {
    console.error("Remove connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/seekers:
 *   get:
 *     summary: Get list of job seekers to connect with (excluding existing connections)
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or headline
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of seekers to return
 *     responses:
 *       200:
 *         description: List of job seekers
 */
router.get("/seekers", auth, authorize("seeker"), async (req, res) => {
  try {
    const { search, limit } = req.query;
    const maxLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // Get all existing connections (accepted, pending, or rejected)
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    const connectedUserIds = connections.map((conn) =>
      conn.requester.toString() === req.user._id.toString()
        ? conn.recipient.toString()
        : conn.requester.toString()
    );

    // Add current user to excluded list
    connectedUserIds.push(req.user._id.toString());

    // Build query
    const userQuery = {
      _id: { $nin: connectedUserIds },
      role: "seeker",
    };

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    // Get users
    const users = await User.find(userQuery).limit(maxLimit).select("name email");

    // Get profiles for these users
    const userIds = users.map((u) => u._id);
    const profiles = await JobSeekerProfile.find({ user: { $in: userIds } }).select(
      "user fullName headline profilePicture location skills"
    );

    // Combine user and profile data
    const seekers = users.map((user) => {
      const profile = profiles.find((p) => p.user.toString() === user._id.toString());
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        fullName: profile?.fullName || user.name,
        headline: profile?.headline || "",
        profilePicture: profile?.profilePicture || "",
        location: profile?.location || "",
        skills: profile?.skills || [],
      };
    });

    res.json({ seekers, count: seekers.length });
  } catch (error) {
    console.error("Get seekers error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/connections/profile/{userId}:
 *   get:
 *     summary: Get profile of a connected seeker
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the connected seeker
 *     responses:
 *       200:
 *         description: Seeker profile
 *       403:
 *         description: Not connected with this user
 *       404:
 *         description: Profile not found
 */
router.get("/profile/:userId", auth, authorize("seeker"), async (req, res) => {
  try {
    // Check if users are connected
    const connection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: req.params.userId, status: "accepted" },
        { requester: req.params.userId, recipient: req.user._id, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({ message: "You are not connected with this user" });
    }

    const profile = await JobSeekerProfile.findOne({ user: req.params.userId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Get connected profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
