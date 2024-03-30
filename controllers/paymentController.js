import MemberModel from "../models/MemberModel.js";
import PaymentModel from "../models/PaymentModel.js";
import mongoose from "mongoose";
import authorizeActionInOrganization from "../utils/authorizeActionInOrganization.js";
import getRequiredOrganizationId from "../utils/getRequiredOrganizationId.js";
class PaymentController{
    static getPaymentById = async (req, res) => {
        try {
            const { paymentId } = req.params;
    
            // Check if paymentId is provided
            if (!paymentId) {
                throw new Error("Payment ID is required");
            }
    
            // Fetch the payment by its ID
            const payment = await PaymentModel.findById(paymentId);
    
            // Check if payment exists
            if (!payment) {
                throw new Error("Payment not found");
            }
    
            // Send the payment data in the response
            res.send({
                status: "success",
                data: payment
            });
        } catch (err) {
            console.error("Error fetching payment:", err);
            res.status(500).send({
                status: "failed",
                message: err.message
            });
        }
    };
    
    static makePayment = async (req, res) => {
        const { amount, type, method, paidBy } = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            if (!amount || !type || !method || !paidBy) throw new Error("All fields are required");
    
            // Fetch the member and its corresponding account
            const member = await MemberModel.findById(paidBy).populate('account');
            if (!member) throw new Error("No such member found!");

            authorizeActionInOrganization(req.user, member.organization, "You are not authorized to make payment in this organization");
            
            const orgaizationId = getRequiredOrganizationId(req, "Admin requires  organization ID  to create a payment.");
            // Create the payment entry
            const payment = await PaymentModel.create([{ amount, type, method, paidBy , organization : orgaizationId}], { session });
    
            // Update the member's payments array with the payment ID
            member.payments.push(payment[0]._id);
    
            // Update the account balance
            member.account.balance -= amount; 
    
            // Save the member and its corresponding account
            await Promise.all([member.save({ session }), member.account.save({ session })]);
    
            // Commit the transaction and end the session
            await session.commitTransaction();
            await session.endSession();
    
            return res.send({ status: "success", message: "Payment made successfully" , data : [member , payment] });
        } catch (err) {
            // Rollback the transaction and end the session in case of an error
            await session.abortTransaction();
            await session.endSession();
    
            console.log("makePayment error:", err);
            return res.send({ status: "failed", message: `${err.message}` });
        }

    };

    static updatePaymentById = async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { paymentId } = req.params;
            const { amount, method } = req.body;
    
            // Check if paymentId is provided
            if (!paymentId) {
                throw new Error("Payment ID is required");
            }
    
            // Fetch the payment by its ID
            const payment = await PaymentModel.findById(paymentId);
            const member = await MemberModel.findById(payment.paidBy).populate('account');
            if(!member) throw new Error("Payment not updated ! member who paid does not exists");
            
            //check auth
            authorizeActionInOrganization(req.user, payment.organization)

            // Check if payment exists
            if (!payment) {
                throw new Error("Payment not found");
            }
    
            // Update the payment fields
            if (amount) {
                //Before updating the amout reflecting the changes of this updation in curresponding member's account
                const prevAmount = payment.amount;
                const updateAmount = amount;
                member.account.balance = member.account.balance + (prevAmount - updateAmount);
                payment.amount = amount;   
                
            }
            if (method) {
                payment.method = method;
            }
            
            
            payment.updatedAt = Date.now();
            
            // Save the updated payment and updated Acount Balance of the curresponding user
            await Promise.all([payment.save({session}), member.account.save({session})]);
           
            await session.commitTransaction();   
            await session.endSession();

            // Send the updated payment data in the response
            res.send({
                status: "success",
                message: "Payment and curresponding Account updated successfully",
                data: [payment,  member.account]
            });
        } catch (err) {
            await session.abortTransaction();
            await session.endSession();
            console.error("Error updating payment:", err);
            res.status(500).send({
                status: "failed",
                message: err.message
            });
        }
    };

    static deletePaymentById = async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { paymentId } = req.params;
    
            // Check if paymentId is provided
            if (!paymentId) {
                throw new Error("Payment ID is required");
            }
    
            // Fetch the payment by its ID
            const payment = await PaymentModel.findById(paymentId);
            const member = await MemberModel.findById(payment.paidBy).populate('account');
            if(!member) throw new Error("Payment not updated ! member who paid does not exists");
            
            //check auth
            authorizeActionInOrganization(req.user, payment.organization)

            // Check if payment exists
            if (!payment) {
                throw new Error("Payment not found");
            }
    
            // Update the payment fields
            if (amount) {
                //Before updating the amout reflecting the changes of this updation in curresponding member's account
                const prevAmount = payment.amount;
                const updateAmount = amount;
                member.account.balance = member.account.balance + (prevAmount - updateAmount);
                payment.amount = amount;   
                
            }
            if (method) {
                payment.method = method;
            }
            
            
            payment.updatedAt = Date.now();
            
            // Save the updated payment and updated Acount Balance of the curresponding user
            await Promise.all([payment.save({session}), member.account.save({session})]);
           
            await session.commitTransaction();   
            await session.endSession();

            // Send the updated payment data in the response
            res.send({
                status: "success",
                message: "Payment and curresponding Account updated successfully",
                data: [payment,  member.account]
            });
        } catch (err) {
            await session.abortTransaction();
            await session.endSession();
            console.error("Error updating payment:", err);
            res.status(500).send({
                status: "failed",
                message: err.message
            });
        }
    };
    
    
}

export default PaymentController;