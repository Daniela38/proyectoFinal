import config from '../config/dotenv.config.js';
import { default as token } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { mailConfig } from "../utils/mailer.js";
import UserService from '../services/users.services.js';
import bcrypt from 'bcrypt';
import { createHash } from '../utils/utils.js';
import jwt from 'jsonwebtoken';
import UsersModel from '../dao/models/users.model.js';

const userService = new UserService();

const register = (req, res) => {
    res.send({ status: "success", message: "User registered", user: req.user});
}

const login = (req, res) => {
    res.cookie("loginCookieToken", req.user, {httpOnly: true}).status(200).send({msg:"Cookie set", jwt: req.user});
}

const resetPassword = async (req, res) => {
  res.send({status: 1, msg: 'Password successfully reseted.'});
}

const sendEmail = (req, res) => {
  try {
      const email = req.params.email;
      const token = jwt.sign({email}, config.privateKey, { expiresIn: '1h' });
      const transport = nodemailer.createTransport(mailConfig);
      transport.sendMail(
          {
              from: config.mailing.USER,
              to: email,
              subject: 'Test',
              html: `<h1>Reset your password</h1>
              <p>Click <a href="http://localhost:8080/restore_password/${token}">here</a> to reset your password</p>`
          }
      )
      res.send('Email sent!')
  } catch (error) {
      throw error;
  }
}

const restorePass = async (req, res) => {
  try{
    const { email } = req.body
    //const { token } = req.params;
    const { newPassword } = req.body;
    //const data = jwt.decode(token);
    //console.log(data)
    //const email = data.email
    const user = await userService.getUserByEmail(email);

    /*const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ status: "error", error: "Unauthorized" })
    const token = authHeader.split(' ')[1];
    token = req.params.token;
    //const { token } = req.params;
    console.log(token)
    const { newPassword } = req.body;
    //jwt.verify(token, config.privateKey);
    const data = jwt.decode(token);
    const email = data.email
    const user = await userService.getUserByEmail(email);*/
    if(bcrypt.compareSync(newPassword, user.password)){
      res.status(400).send('You cannot use the same password');
      return;
    }
    const hashedNewPassword = createHash(newPassword);
    user.password = hashedNewPassword;
    await user.save();
    res.status(200).send('Password updated successfully');
  } catch (error){
    throw error;
  }
}

const changeUserRole = (req, res) => {
  try {
    const userId = req.params.uid;
    const newRole = req.body.role;

    if (["user", "admin", "premium"].includes(newRole)) {
      const updateUser = UsersModel.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true }
      );

      if (updateUser) {
        res.status(200).json(updateUser);
      } else {
        res.status(404).send("User not found");
      }
    }else{
      res.status(400).send("Invalid role");
    }
  } catch (error) {
    req.logger.error(`Interval server error ${error}`)
    res.status(500).send(`Interval server error ${error}`)
  }
}

export const createDocuments = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await UsersModel.findById(uid);
    const documents = user.documents || [];

    if (req.files && req.files.length > 0) {
      const newDocuments = [
        ...documents,
        ...req.files.map((file) => ({
          name: file.originalname,
          reference: file.path,
        })),
      ];

      await user.updateOne({ documents: newDocuments });
    }

    res.status(200).send("Documents created successfully");
  } catch (error) {
    console.error(`Interval server error ${error}`);
    res.status(500).send(`Interval server error ${error}`);
  }
};

const current = (req, res) => {
    res.status(200).send(req.user.user);
}

const github = (req, res) => {
};

const githubCallback = (req, res) => {
    res.cookie("loginCookieToken", req.user, {httpOnly: true}).redirect('/products');
}

const logout = (req, res) => {
    req.session.destroy();
    res.send({status: 1, message: "Successfully logout"})
}

export default {
    register,
    login,
    resetPassword,
    sendEmail,
    restorePass,
    changeUserRole,
    createDocuments,
    current,
    github,
    githubCallback,
    logout
}