import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"

//CONTROLLER FOR REGISTER USER
const registerUser = asyncHandler(async (req, res) => {

    //GET USER DETAILS FROM FRONTEND
    const { fullName, email, username, password } = req.body;
    console.log("email: ", email);

    //VALIDATION-NOT EMPTY
    // if (fullName === "") {
    //     throw new ApiError(400, "Fullname is required")
    // }
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    //CHECK IF USER ALREADY EXISTS: USERNAME AND EMAIL
    //from this $or we can pass multple fields to check 
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //CHECK FOR IMAGES,CHECK FOR AVATAR
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //UPLOAD THEM TO CLOUDINARY,AVATAR
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //CREATE USER OBJECT-CREATE ENTRY IN DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowercase()
    })

    //REMOVE PASSWORD AND REFRESH TOKEN FROM THE FIELD
    // we use select for remove the fileds from user object
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //CHECK FOR USER CREATION
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //RETURN RES
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})


export { registerUser }