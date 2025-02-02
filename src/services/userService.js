import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { BrevoProvider } from '~/providers/BrevoProvider'

const createNew = async (reqBody) => {
  try {
    // Kiểm tra xem email đã tồn tại trong hệ thống hay chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exist!')
    }
    // Tạo data để lưu vào Database
    // nameFromEmail: nếu email là tranthuan04102004@gmail.com thì sẽ lấy được "tranthuan04102004"
    const nameFromEmail = reqBody.email.split('@')[0]
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8), // tham số thứ hai là độ phức tạp , giá trị càng cao thì băm càng lấu
      username: nameFromEmail,
      displayName: nameFromEmail,
      verifyToken: uuidv4()
    }

    // Thực hiện lưu thông tin User vào Database
    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)
    // Gửi email cho người dùng xác thực tài khoản
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`
    const customSubject = 'Trello MERN Stack Advanced: Please verify your email before using our services!'
    const htmlContent = `
      <h3>Here is your verification link:</h3>
      <h3>${verificationLink}</h3>
      <h3>Sincerely,<br/> - Thuan Tran - Project-NT114 - </h3>
    `
    // Gọi tới cái Provider gửi mail
    /**
     * Update kiến thức: Brevo update vụ Whitelist IP tương tự MongoDB Atlas, nếu bạn không gửi được mail thì cần phải config 0.0.0.0 hoặc uncheck cái review IP Address trong dashboard là được nhé.
     * https://app.brevo.com/security/authorised_ips
     */
    await BrevoProvider.sendEmail(getNewUser.email, customSubject, htmlContent)


    // return trả về dữ liệu cho phía Controller
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

export const userService = {
  createNew
}