const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Programs = require("./Programs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  activeProgram: {
    type: Boolean,
    required: true,
  },
  programs: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "programs" },
      date: { type: Date, default: Date.now },
    },
  ],
});

/*
  Returns if given username exists and username, dob, and email of that user

  input: username string
  output: {
    exists: bool, 
    user: {
      username string, 
      dob date, 
      email string
    }
  }
*/
userSchema.methods.getUserByUsername = (username) => {
  return mongoose
    .model("users")
    .findOne({ username: username }, { username: 1, dob: 1, email: 1 })
    .then((existingUser) => {
      if (existingUser) {
        console.log("User exists");
      }
      return { exists: !!existingUser, userData: existingUser };
    })
    .catch((error) => {
      console.log("Error checking username");
      throw error;
    });
};

userSchema.methods.getFullUser = (username) => {
  return mongoose
    .model("users")
    .findOne({ username: username })
    .then((existingUser) => {
      return existingUser;
    })
    .catch((error) => {
      console.log("Error checking username");
      throw error;
    });
};

userSchema.statics.getUserStat = (username, stat) => {
  return mongoose
    .model("users")
    .findOne({ username: username }, stat)
    .then((userStat) => {
      return userStat;
    })
    .catch((error) => {
      console.log("Error checking username");
      throw error;
    });
};

userSchema.statics.updateUserStat = (username, statName, newValue) => {
  return mongoose
    .model("users")
    .findOneAndUpdate(
      { username: username },
      { $set: { [statName]: newValue } },
      { new: true } // Returns the updated document
    )
    .then((updatedUser) => {
      return updatedUser;
    })
    .catch((error) => {
      console.log("Error updating user stat");
      throw error;
    });
};

/*
  Returns if given email exists and username, dob, and email of that user

  input: email string
  output: {
    exists: bool, 
    user: {
      username string, 
      dob date, 
      email string
    }
  }
*/
userSchema.methods.getUserByEmail = (email) => {
  return mongoose
    .model("users")
    .findOne(
      { email: { $regex: new RegExp(email, "i") } },
      { username: 1, dob: 1, email: 1 }
    )
    .then((existingEmail) => {
      if (existingEmail) {
        console.log("Email exists");
      }
      return { exists: !!existingEmail, user: existingEmail };
    })
    .catch((error) => {
      console.log("Error checking email");
      throw error;
    });
};

/*
  Hashes and salts given password. Creates new user with given information and encrypted password. Returns new user

  input: pass string, email string, username string, dob date
  output: user object
*/
userSchema.methods.createUser = (pass, email, username, dob) => {
  return bcrypt
    .genSalt(10)
    .then((salt) => {
      return bcrypt.hash(pass, salt).then((hashedPass) => {
        const newUser = new mongoose.model("users")({
          username: username,
          dob: dob,
          email: email,
          password: hashedPass,
          activeProgram: false,
        });

        return newUser
          .save()
          .then((savedUser) => {
            return savedUser;
          })
          .catch((error) => {
            throw error;
          });
      });
    })
    .catch((error) => {
      console.log("Error adding user");
      throw error;
    });
};

/*
  Returns username, dob, and email of user with given user id

  input: user id
  output: {
    exists: bool, 
    user: {
      username string, 
      dob date, 
      email string
    }
  }
*/
userSchema.methods.getUserByID = (userID) => {
  return mongoose
    .model("users")
    .findOne({ _id: userID }, { username: 1, dob: 1, email: 1 })
    .catch((error) => {
      console.log("Error getting user information");
      throw error;
    });
};

/*
  Returns an array of programs in user with given user id's program array. Returns all programs from index to inc. Returns only program id, program name, owner name, and owner last opened

  input: user id, index number, inc number
  output: [{
    _id: program id, 
    name: program name string, 
    ownerName: owner name string, 
    lastOpened: owner last opened date,
    editorPermissions: boolean whether the program as editor permission
    role: "owner", "viewer", "editor", or "none"
  }]
*/
userSchema.methods.getProgramListStaggered = (userID, index, inc) => {
  console.log(userID);
  return mongoose
    .model("users")
    .findOne({ _id: userID })
    .populate({
      path: "programs._id",
      select: "name owner",
      populate: [{ path: "owner", select: "username" }],
    })
    .then((user) => {
      if (!user) {
        throw "User not found";
      }

      const programs = user.programs
        .sort((a, b) => b.date - a.date)
        .slice(index, index + inc)
        .map((program) => ({
          _id: program._id._id,
          name: program._id.name,
          ownerName: program._id.owner.username,
          lastOpened: program.date,
          editorPermissions:
            program._id.owner._id.toString() === userID.toString() ||
            program._id.editors.includes(userID),
          role:
            program._id.owner._id.toString() === userID.toString()
              ? "owner"
              : program._id.viewers.includes(userID)
              ? "viewer"
              : program._id.editors.includes(userID)
              ? "editor"
              : "none",
        }));

      return programs;
    })
    .catch((error) => {
      console.log("Error getting user information");
      throw error;
    });
};

/*
  Update user with given user id's program array to have program with given program id's last opened date be right now

  input: user id, program id
  output: none
*/
userSchema.methods.updateLastOpened = async function (userID, programID) {
  try {
    const user = await mongoose
      .model("users")
      .findOne({ _id: userID }, { programs: 1 });

    if (!user) {
      throw new Error("User not found");
    }

    const programIndex = user.programs.findIndex(
      (program) => program._id.toString() === programID
    );

    if (programIndex === -1) {
      const program = await mongoose
        .model("programs")
        .findOne({ _id: programID }, { isPublic: 1, viewers: 1 });

      if (program.isPublic) {
        Promise.all[
          (new Users().addProgramToManyUsers(programID, [userID]),
          new Programs().updateProgram({
            viewers: [...program.viewers, userID],
            programID,
          }))
        ];
        return;
      } else {
        throw new Error("Private program is not accessible by user");
      }
    }

    user.programs[programIndex].date = new Date();
    await user.save();
  } catch (error) {
    console.log("Error updating last opened date");
    throw error;
  }
};

/*
  Takes an array of usernames and converts them to their corresponding user id

  input: [username string] array
  output: [user id] array
*/
userSchema.methods.manyUsernameToManyID = async function (usernameArray) {
  try {
    return await Users.find({
      username: { $in: usernameArray },
    }).distinct("_id");
  } catch (error) {
    console.log("Error converting username to id");
    throw error;
  }
};

/*
  Adds a given program id to the program array of all the users in the given newUsers array

  input: program id, [user id] array
  output: none
*/
userSchema.methods.addProgramToManyUsers = async function (
  programID,
  newUsers
) {
  try {
    const users = await mongoose
      .model("users")
      .find({ _id: { $in: [...newUsers] } });

    for (const user of users) {
      const existingProgram = user.programs.find(
        (program) => program._id.toString() === programID.toString()
      );

      if (!existingProgram) {
        user.programs.push({ _id: programID, date: new Date() });
        await user.save();
      }
    }

    console.log("Users and program updated successfully");
  } catch (error) {
    console.log("Error adding programs", error);
    throw error;
  }
};

const Users = mongoose.model("users", userSchema);

module.exports = Users;
