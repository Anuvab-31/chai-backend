import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndReferenceTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false }) //this validateBeforeSave -->> not validate all fields only add refresh token to the user object before save

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

//CONTROLLER FOR REGISTER USER
const registerUser = asyncHandler(async (req, res) => {

    //GET USER DETAILS FROM FRONTEND
    const { fullName, email, username, password } = req.body;

    //VALIDATION-NOT EMPTY
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    //CHECK IF USER ALREADY EXISTS: USERNAME AND EMAIL
    //from this $or we can pass multple fields to check
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //CHECK FOR IMAGES,CHECK FOR AVATAR
    const avatarLocalPath = await req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req?.files?.coverImage) && req?.files?.coverImage?.length > 0) {
        coverImageLocalPath = req?.files?.coverImage[0]?.path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //UPLOAD THEM TO CLOUDINARY,AVATAR
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar file is required while uploading")
    // }

    //CREATE USER OBJECT-CREATE ENTRY IN DB
    const user = await User.create({
        fullName,
        // avatar: avatar.url,
        avatar: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.pngegg.com%2Fen%2Fsearch%3Fq%3Davatars&psig=AOvVaw1BptGlfzmEN0IinKEbSwQM&ust=1712599824972000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCLDkl9PZsIUDFQAAAAAdAAAAABAE",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
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

//CONTROLLER FOR LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
    //req body -> data

    const { email, username, password } = req.body;

    //username or email login
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    //find the  user with email or username
    // User.findOne({ username }) //it will find only username
    // User.findOne({ email }) //it will find only email

    //it will find both username and email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user doesnot exists")
    }

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    //access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndReferenceTokens(user._id)

    //send to cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");


    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            },
                "User logged in successfully"
            )
        )

})

//CONTROLLER FOR LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {

    // $unset // this removes the field from document
    User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1
        },
    },
        {
            new: true //it return updated object
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logout successfully"))
})


export { registerUser, loginUser, logoutUser }