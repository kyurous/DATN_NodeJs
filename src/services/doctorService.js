import db from "../models/index";
require("dotenv").config();
import _ from "lodash";
import emailService from "../services/emailService";
const textToImage = require("text-to-image");
const { Op } = require("sequelize");
const nodeHtmlToImage = require("node-html-to-image");
const fs = require("fs");

const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;

const units = [
  { key: "pill", valueVi: "Viên", valueEn: "Pill" },
  { key: "package", valueVi: "Gói", valueEn: "Package" },
  { key: "bottle", valueVi: "Chai", valueEn: "Bottle" },
  { key: "tube", valueVi: "Ống", valueEn: "Tube" },
  { key: "set", valueVi: "Bộ", valueEn: "Set" },
];

let getTopDoctorHome = (dataInput) => {
  return new Promise(async (resolve, reject) => {
    try {
      let options = {
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: db.Allcode,
            as: "positionData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Allcode,
            as: "genderData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Doctor_Infor,
            attributes: ["specialtyId"],
            include: [
              {
                model: db.Specialty,
                as: "specialtyData",
                attributes: ["name"],
              },
            ],
          },
        ],
        raw: true,
        nest: true,
      };

      if (dataInput.limit) options.limit = parseInt(dataInput.limit);

      let users = await db.User.findAll(options);

      resolve({
        errCode: 0,
        data: users,
      });
    } catch (e) {
      reject(e);
    }
  });
};

let getAllDoctors = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let doctors = await db.User.findAll({
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: db.Allcode,
            as: "positionData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Allcode,
            as: "genderData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Doctor_Infor,
            attributes: ["specialtyId", "provinceId"],
            include: [
              {
                model: db.Specialty,
                as: "specialtyData",
                attributes: ["name"],
              },
              {
                model: db.Allcode,
                as: "provinceTypeData",
                attributes: ["valueEn", "valueVi"],
              },
              {
                model: db.Clinic,
                as: "clinicData",
                attributes: ["name"],
              },
            ],
          },
        ],
        raw: true,
        nest: true,
      });

      resolve({
        errCode: 0,
        data: doctors,
      });
    } catch (e) {
      reject(e);
    }
  });
};

let filterDoctors = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let options = {
        where: {},
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: db.Allcode,
            as: "positionData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Allcode,
            as: "genderData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.Doctor_Infor,
            attributes: ["specialtyId", "provinceId"],
            include: [
              {
                model: db.Specialty,
                as: "specialtyData",
                attributes: ["name"],
              },
              {
                model: db.Allcode,
                as: "provinceTypeData",
                attributes: ["valueEn", "valueVi"],
              },
              {
                model: db.Clinic,
                as: "clinicData",
                attributes: ["name"],
              },
            ],
          },
        ],
        raw: true,
        nest: true,
      };
      let firstName = data.firstName;
      let lastName = data.lastName;
      let role = "R2";
      let position = data.position;

      if (firstName) {
        options.where.firstName = {
          [Op.like]: "%" + firstName + "%",
        };
      }
      if (lastName) {
        options.where.lastName = {
          [Op.like]: "%" + lastName + "%",
        };
      }
      if (position) options.where.positionId = position;
      if (role) options.where.roleId = role;

      let dataDoctors = [];
      dataDoctors = await db.User.findAll(options);
      resolve({
        errCode: 0,
        data: dataDoctors,
      });
    } catch (e) {
      reject(e);
    }
  });
};

// let getAllDoctors = () => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       let doctors = await db.User.findAll({
//         where: { roleId: "R2" },
//         attributes: {
//           exclude: ["password", "image"],
//         },
//       });

//       resolve({
//         errCode: 0,
//         data: doctors,
//       });
//     } catch (e) {
//       reject(e);
//     }
//   });
// };
let checkRequiredFields = (inputData) => {
  let arrFields = [
    "doctorId",
    "contentHTML",
    "contentMarkdown",
    "action",
    "selectedPrice",
    "selectedPayment",
    "selectedProvice",
    "nameClinic",
    "addressClinic",
    "note",
    "specialtyId",
  ];

  let isValid = true;
  let element = "";
  for (let i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) {
      isValid = false;
      element = arrFields[i];
      break;
    }
  }
  return {
    isValid: isValid,
    element: element,
  };
};

let saveDetailInforDoctor = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let checkObj = checkRequiredFields(inputData);
      if (checkObj.isValid === false) {
        resolve({
          errCode: 1,
          errMessage: `Missing parameter: ${checkObj.element}`,
        });
      } else {
        //upsert to Markdown
        if (inputData.action === "CREATE") {
          await db.Markdown.create({
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            description: inputData.description,
            doctorId: inputData.doctorId,
          });
        } else if (inputData.action === "EDIT") {
          let doctorMarkdown = await db.Markdown.findOne({
            where: { doctorId: inputData.doctorId },
            raw: false,
          });

          if (doctorMarkdown) {
            doctorMarkdown.contentHTML = inputData.contentHTML;
            doctorMarkdown.contentMarkdown = inputData.contentMarkdown;
            doctorMarkdown.description = inputData.description;
            doctorMarkdown.doctorId = inputData.doctorId;
            // doctorMarkdown.updatedAt = new Date();
            await doctorMarkdown.save();
          }
        }

        //upsert to Doctor_infor tabel
        let doctorInfor = await db.Doctor_Infor.findOne({
          where: {
            doctorId: inputData.doctorId,
          },
          raw: false,
        });

        if (doctorInfor) {
          //update
          doctorInfor.doctorId = inputData.doctorId;
          doctorInfor.priceId = inputData.selectedPrice;
          doctorInfor.provinceId = inputData.selectedProvice;
          doctorInfor.paymentId = inputData.selectedPayment;
          doctorInfor.nameClinic = inputData.nameClinic;
          doctorInfor.addressClinic = inputData.addressClinic;
          doctorInfor.note = inputData.note;
          doctorInfor.specialtyId = inputData.specialtyId;
          doctorInfor.clinicId = inputData.clinicId;

          await doctorInfor.save();
        } else {
          //create
          await db.Doctor_Infor.create({
            doctorId: inputData.doctorId,
            priceId: inputData.selectedPrice,
            provinceId: inputData.selectedProvice,
            paymentId: inputData.selectedPayment,
            nameClinic: inputData.nameClinic,
            addressClinic: inputData.addressClinic,
            note: inputData.note,
            specialtyId: inputData.specialtyId,
            clinicId: inputData.clinicId,
          });
        }
        resolve({
          errCode: 0,
          errMessage: "Save infor doctor succeed!",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getDetailDoctorById = (inputId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let data = await db.User.findOne({
          where: { id: inputId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Markdown,
              attributes: ["description", "contentHTML", "contentMarkdown"],
            },
            {
              model: db.Doctor_Infor,
              attributes: {
                exclude: ["id", "doctorId"],
              },
              include: [
                {
                  model: db.Allcode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.Allcode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.Allcode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
            {
              model: db.Allcode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        //convert image tu buffer sang base64
        if (data && data.image) {
          data.image = Buffer.from(data.image, "base64").toString("binary");
        }

        if (!data) {
          data = {};
        }

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let bulkCreateSchedule = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.arrSchedule || !data.doctorId || !data.date) {
        resolve({
          errCode: 1,
          errMessage: "Missing required param",
        });
      } else {
        let schedule = data.arrSchedule;
        if (schedule && schedule.length > 0) {
          schedule = schedule.map((item) => {
            item.maxNumber = MAX_NUMBER_SCHEDULE;
            return item;
          });
        }

        //get all existing data
        let existing = await db.Schedule.findAll({
          where: { doctorId: data.doctorId, date: data.date },
          attributes: ["timeType", "date", "doctorId", "maxNumber"],
          raw: true,
        });

        //convert date
        // if (existing && existing.length > 0) {
        //   existing = existing.map((item) => {
        //     item.date = new Date(item.date).getTime();
        //     return item;
        //   });
        // }

        //compare difference
        let toCreate = _.differenceWith(schedule, existing, (a, b) => {
          return a.timeType === b.timeType && +a.date === +b.date;
        });

        //create data
        if (toCreate && toCreate.length > 0) {
          await db.Schedule.bulkCreate(toCreate);
        }

        resolve({
          errCode: 0,
          errMessage: "OK",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getScheduleByDate = (doctorId, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !date) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let dataSchedule = await db.Schedule.findAll({
          where: { doctorId: doctorId, date: date },
          include: [
            {
              model: db.Allcode,
              as: "timeTypeData",
              attributes: ["valueEn", "valueVi", "value"],
            },
            {
              model: db.User,
              as: "doctorData",
              attributes: ["firstName", "lastName"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (!dataSchedule) {
          dataSchedule = [];
        }
        resolve({
          errCode: 0,
          data: dataSchedule,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getExtraInforDoctorById = (doctorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.Doctor_Infor.findOne({
          where: { doctorId: doctorId },
          attributes: {
            exclude: ["id", "doctorId"],
          },
          include: [
            {
              model: db.Allcode,
              as: "priceTypeData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Allcode,
              as: "provinceTypeData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Allcode,
              as: "paymentTypeData",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (!data) {
          data = [];
        }
        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getProfileDoctorById = (doctorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.User.findOne({
          where: { id: doctorId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Markdown,
              attributes: ["description", "contentHTML", "contentMarkdown"],
            },
            {
              model: db.Allcode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Doctor_Infor,
              attributes: {
                exclude: ["id", "doctorId"],
              },
              include: [
                {
                  model: db.Allcode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.Allcode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.Allcode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
          ],
          raw: false,
          nest: true,
        });

        //convert image tu buffer sang base64
        if (data && data.image) {
          data.image = Buffer.from(data.image, "base64").toString("binary");
        }

        if (!data) {
          data = {};
        }

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getListPatientForDoctor = (doctorId, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !date) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.Booking.findAll({
          where: { doctorId: doctorId, date: date }, //statusId: "S2", 
          include: [
            {
              model: db.User,
              as: "patientData",
              attributes: [
                "email",
                "firstName",
                "address",
                "gender",
                "phonenumber",
              ],
              include: [
                {
                  model: db.Allcode,
                  as: "genderData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
            {
              model: db.Allcode,
              as: "timeTypeDataPatient",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Allcode,
              as: "statusData",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (!data) {
          data = {};
        }

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getBookingById = (bookingId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!bookingId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.Booking.findOne({
          where: { id: bookingId },
          include: [
            {
              model: db.User,
              as: "patientData",
              attributes: [
                "email",
                "firstName",
                "address",
                "gender",
                "phonenumber",
              ],
              include: [
                {
                  model: db.Allcode,
                  as: "genderData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
            {
              model: db.Allcode,
              as: "timeTypeDataPatient",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (!data) {
          data = {};
        }

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let cancelBooking = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.date || !data.doctorId || !data.patientId || !data.timeType) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {

        //update booking status statusId: "S2",
        let appoinment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            date: data.date,
            statusId: "S2",
          },
          include: [
            {
              model: db.User,
              as: "patientData",
              attributes: ["email", "firstName", "lastName"],
            },
            {
              model: db.Allcode,
              as: "timeTypeDataPatient",
              attributes: ["valueVi", "valueEn"],
            },
            {
              model: db.User,
              as: "dataDoctor", // Sử dụng alias mới
              attributes: ["firstName", "lastName"],
            },
          ],
          raw: false,
        });

        if (appoinment) {
          appoinment.statusId = "S4";
          await appoinment.save();

          const doctorName = appoinment.dataDoctor
            ? ` ${appoinment.dataDoctor.lastName} ${appoinment.dataDoctor.firstName}`
            : data.doctorName || "Chưa xác định";

          const patientData = appoinment.patientData
            ? ` ${appoinment.patientData.lastName} ${appoinment.patientData.firstName}`
            : data.patientData || "Chưa xác định";

          const formatDate = (timestamp) => {
            const date = new Date(parseInt(timestamp));
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
          }
          const formattedDate = formatDate(data.date);

          await emailService.sendCancelBookingEmail({
            receiverEmail: appoinment.patientData.email,
            patientName: appoinment.patientData.firstName,
            time: appoinment.timeTypeDataPatient.valueVi || data.timeType,
            doctorName: doctorName, // truyền thêm từ FE nếu cần
            date: formattedDate,
            language: data.language || "vi",
          });
        }

        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let sendRemedy = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.doctorId || !data.patientId || !data.timeType) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        //update patient status
        let appoinment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            statusId: "S2",
          },
          raw: false,
        });

        if (appoinment) {
          appoinment.statusId = "S3";
          await appoinment.save();
        }

        //send email remedy
        await emailService.sendAttachment(data);

        //create invoice table
        await db.Invoice.create({
          doctorId: data.doctorId,
          patientId: data.patientId,
          specialtyId: data.specialtyId,
          totalCost: data.totalCost ? data.totalCost * 22000 : 0,
        });

        //update to Revenue User table
        let userTotalRevenue = await db.User.findOne({
          where: { id: data.doctorId },
          raw: false,
        });

        if (userTotalRevenue) {
          userTotalRevenue.totalRevenue =
            userTotalRevenue.totalRevenue + parseInt(data.totalCost);
          await userTotalRevenue.save();
        }

        //update to totalCost User table
        let userTotalCost = await db.User.findOne({
          where: { id: data.patientId },
          raw: false,
        });
        if (userTotalCost) {
          userTotalCost.totalCost =
            userTotalCost.totalCost + parseInt(data.totalCost);
          await userTotalCost.save();
        }

        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let handleGetValueUnitDrug = (drugKey, language) => {
  for (let i = 0; units.length - 1; i++) {
    if (units[i].key == drugKey) {
      if (language == "vi") return units[i].valueVi;
      else return units[i].valueEn;
    }
  }
};
// let createRemedy = (data) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       if (
//         !data.doctorId ||
//         !data.patientId ||
//         !data.timeType ||
//         !data.date ||
//         !data.token ||
//         !data.patientName ||
//         !data.email ||
//         !data.desciption ||
//         !data.listSeletedDrugs
//       ) {
//         resolve({
//           errCode: 1,
//           errMessage: "Missing required parameter",
//         });
//       } else {
//         //create image remedy
//         //get today
//         let today = new Date();
//         let dd = String(today.getDate()).padStart(2, "0");
//         let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
//         let yyyy = today.getFullYear();

//         today = dd + "/" + mm + "/" + yyyy;
//         let contentImageVi = `
//         <html>
//         <body> 
//           <h3>Kết quả khám ngày: ${today}</h3>
//            <h3>Bác sĩ phụ trách: ${data.doctorName}</h3>
//           <h3>Bệnh nhân: ${data.patientName}</h3>
//           <h3>Email: ${data.email}</h3>
//            <table border="1">
//               <tr>
//                 <th>Tên thuốc</th>
//                 <th>Đơn vị</th>
//                 <th>Số lượng</th>
//                 <th>Hướng dẫn sử dụng</th>
//               </tr>
//               ${data.listSeletedDrugs.map((drug) => {
//           return (`
//                   <tr>
//                     <td>${drug.name}</td>
//                     <td>${handleGetValueUnitDrug(drug.unit, "vi")}</td>
//                     <td>${drug.amount}</td>
//                     <td>${drug.description_usage}</td>
//                   </tr>`
//           );
//         })}
//           </table>
//           <h3>Kết quả khám: ${data.desciption}</h3>
//         </body>
//         </html>
//         `;

//         let contentImageEn = `
//         <html>
//         <body> 
//           <h3>Date prescription information: ${today}</h3>
//            <h3>Doctor in charge: ${data.doctorName}</h3>
//           <h3>Patient: ${data.patientName}</h3>
//           <h3>Email: ${data.email}</h3>
//            <table border="1">
//               <tr>
//                 <th>Drug name</th>
//                 <th>Unit</th>
//                 <th>Quantity</th>
//                 <th>User manual</th>
//               </tr>
//               ${data.listSeletedDrugs.map((drug) => {
//           return (`
//                   <tr>
//                     <td>${drug.name}</td>
//                     <td>${handleGetValueUnitDrug(drug.unit, "vi")}</td>
//                     <td>${drug.amount}</td>
//                     <td>${drug.description_usage}</td>
//                   </tr>`
//           );
//         })}
//           </table>
//           <h3>More information: ${data.desciption}</h3>
//         </body>
//         </html>
//         `;

//         let dataUriBase64;

//         const images = await nodeHtmlToImage({
//           html: data.language == "vi" ? contentImageVi : contentImageEn
//         });
//         let base64data = images.toString("base64");
//         dataUriBase64 = "data:image/jpeg;base64," + base64data;

//         // if(data.language=="vi"){
//         //     dataUriBase64 = textToImage.generateSync(contentImageVi, {
//         //       debug: false,
//         //       maxWidth: parseInt("720"),
//         //       fontSize: parseInt("30"),
//         //       fontFamily: "Arial",
//         //       lineHeight: parseInt("50"),
//         //       margin: 10,
//         //       bgColor: "#ffffff",
//         //       textColor: "#000000",
//         //     });
//         // }else{
//         //   dataUriBase64 = textToImage.generateSync(contentImageEn, {
//         //     debug: false,
//         //     maxWidth: parseInt("720"),
//         //     fontSize: parseInt("30"),
//         //     fontFamily: "Arial",
//         //     lineHeight: parseInt("50"),
//         //     margin: 10,
//         //     bgColor: "#ffffff",
//         //     textColor: "#000000",
//         //   });
//         // }

//         //update patient status
//         let appoinment = await db.Booking.findOne({
//           where: {
//             doctorId: data.doctorId,
//             patientId: data.patientId,
//             timeType: data.timeType,
//             date: data.date,
//             token: data.token,
//           },
//           raw: false,
//         });

//         if (appoinment) {
//           appoinment.imageRemedy = dataUriBase64;
//           await appoinment.save();
//         }

//         //create row histories table
//         await db.History.create({
//           doctorId: data.doctorId,
//           patientId: data.patientId,
//           description: data.desciption,
//           files: dataUriBase64,
//           drugs: JSON.stringify(data.listSeletedDrugs),
//           reason: data.patientReason,
//         });

//         resolve({
//           errCode: 0,
//           errMessage: "ok",
//         });
//       }
//     } catch (e) {
//       reject(e);
//     }
//   });
// };

let createRemedy = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.doctorId ||
        !data.patientId ||
        !data.timeType ||
        !data.date ||
        !data.token ||
        !data.patientName ||
        !data.email ||
        !data.desciption ||
        !data.listSeletedDrugs
      ) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        // get today
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, "0");
        let mm = String(today.getMonth() + 1).padStart(2, "0");
        let yyyy = today.getFullYear();
        today = dd + "/" + mm + "/" + yyyy;

        // Create styled HTML content
        const generateHtmlContent = (lang) => {
          const isVi = lang === "vi";
          return `
            <html>
              <head>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    background: white;
                  }
                  h2 {
                    text-align: center;
                    margin-bottom: 20px;
                  }
                  .info {
                    margin-bottom: 20px;
                    font-size: 16px;
                    line-height: 1.6;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 15px;
                    margin-bottom: 20px;
                  }
                  th, td {
                    border: 1px solid #000;
                    padding: 8px 10px;
                    text-align: left;
                  }
                  th {
                    background-color: #f2f2f2;
                  }
                  .result {
                    font-weight: bold;
                    margin-top: 20px;
                  }
                </style>
              </head>
              <body>
                <h2>${isVi ? "PHIẾU KẾT QUẢ KHÁM" : "MEDICAL RESULT FORM"}</h2>
                <div class="info">
                  <div><strong>${isVi ? "Ngày khám" : "Date"}:</strong> ${today}</div>
                  <div><strong>${isVi ? "Bác sĩ phụ trách" : "Doctor"}:</strong> ${data.doctorName}</div>
                  <div><strong>${isVi ? "Bệnh nhân" : "Patient"}:</strong> ${data.patientName}</div>
                  <div><strong>Email:</strong> ${data.email}</div>
                </div>
                <table>
                  <tr>
                    <th>${isVi ? "Tên thuốc" : "Drug name"}</th>
                    <th>${isVi ? "Đơn vị" : "Unit"}</th>
                    <th>${isVi ? "Số lượng" : "Quantity"}</th>
                    <th>${isVi ? "Hướng dẫn sử dụng" : "Instructions"}</th>
                  </tr>
                  ${data.listSeletedDrugs.map((drug) => {
            return `
                      <tr>
                        <td>${drug.name}</td>
                        <td>${handleGetValueUnitDrug(drug.unit, lang)}</td>
                        <td>${drug.amount}</td>
                        <td>${drug.description_usage}</td>
                      </tr>
                    `;
          }).join("")}
                </table>
                <div class="result">
                  ${isVi ? "Kết quả khám" : "Diagnosis"}: ${data.desciption}
                </div>
              </body>
            </html>
          `;
        };

        // Tạo ảnh từ HTML
        const htmlContent = generateHtmlContent(data.language);
        const images = await nodeHtmlToImage({
          html: htmlContent,
        });

        let base64data = images.toString("base64");
        let dataUriBase64 = "data:image/jpeg;base64," + base64data;

        // update booking record
        let appoinment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            date: data.date,
            token: data.token,
          },
          raw: false,
        });

        if (appoinment) {
          appoinment.imageRemedy = dataUriBase64;
          await appoinment.save();
        }

        // save to History
        await db.History.create({
          doctorId: data.doctorId,
          patientId: data.patientId,
          description: data.desciption,
          files: dataUriBase64,
          drugs: JSON.stringify(data.listSeletedDrugs),
          reason: data.patientReason,
        });

        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};



module.exports = {
  getTopDoctorHome: getTopDoctorHome,
  getAllDoctors: getAllDoctors,
  saveDetailInforDoctor: saveDetailInforDoctor,
  getDetailDoctorById: getDetailDoctorById,
  bulkCreateSchedule: bulkCreateSchedule,
  getScheduleByDate: getScheduleByDate,
  getExtraInforDoctorById: getExtraInforDoctorById,
  getProfileDoctorById: getProfileDoctorById,
  getListPatientForDoctor: getListPatientForDoctor,
  sendRemedy: sendRemedy,
  cancelBooking: cancelBooking,
  createRemedy: createRemedy,
  getBookingById: getBookingById,
  filterDoctors: filterDoctors,
};
