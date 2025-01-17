import UserModel from "../model/user.model.js";
import CommentModel from "../model/comment.model.js";
import mongoose from "mongoose";
class CommentService {
    // Método para crear un comentario y asociarlo a un usuario
    async createComment(idUser, comment) {
        try {
            // Buscar al usuario por su ID
            const user = await UserModel.findById(idUser);
            if (!user) {
                throw new Error("User not found"); // Lanza un error si el usuario no existe
            }
            // Crear un nuevo comentario
            const newComment = { comment: comment };
            // Agregar el comentario al array de comentarios del usuario
            user.comments.push(newComment);
            // Guardar el usuario actualizado
            const userSave = await user.save();
            return user; // Retornar el documento del usuario actualizado
        }
        catch (error) {
            throw "No guarda el usuario: " + error;
        }
    }
    // Método para crear una respuesta a un comentario existente
    async createReply(idUser, comment, parent) {
        try {
            // Buscar al usuario por su ID
            const user = await UserModel.findById(idUser);
            if (!user) {
                throw new Error("User not found");
            }
            // Convertir el ID del comentario padre a ObjectId
            const parentObjectId = new mongoose.Types.ObjectId(parent);
            // Crear un nuevo documento de respuesta
            const newReply = new CommentModel({
                comment: comment,
                id_owner: idUser,
                parent: parentObjectId
            });
            // Guardar la respuesta en la base de datos
            const savedReply = await newReply.save();
            return savedReply; // Retornar el documento de la respuesta guardada
        }
        catch (error) {
            throw error;
        }
    }
    // Método para encontrar todos los usuarios con sus comentarios y respuestas
    async findAll() {
        try {
            // Realizar una agregación para desenredar comentarios y respuestas
            const users = await UserModel.aggregate([
                { $unwind: '$comments' },
                {
                    $lookup: {
                        from: 'replies', // Buscar en la colección de respuestas
                        localField: 'comments._id',
                        foreignField: 'parent',
                        as: 'comments.replies' // Asociar respuestas a los comentarios
                    }
                },
                {
                    $unwind: {
                        path: '$comments.replies',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'replies',
                        localField: 'comments.replies._id',
                        foreignField: 'parent',
                        as: 'comments.replies.nested_replies' // Asociar respuestas anidadas
                    }
                },
                {
                    $group: {
                        _id: {
                            user_id: '$_id',
                            comment_id: '$comments._id'
                        },
                        comment: { $first: '$comments.comment' },
                        reactions: { $first: '$comments.reactions' },
                        replies: { $push: '$comments.replies' } // Agrupar respuestas
                    }
                },
                {
                    $project: {
                        _id: 0,
                        user_id: '$_id.user_id',
                        comment_id: '$_id.comment_id',
                        comment: 1,
                        reactions: 1,
                        replies: {
                            $cond: {
                                if: { $eq: [{ $arrayElemAt: ['$replies._id', 0] }, null] },
                                then: [],
                                else: '$replies' // Condicional para manejar respuestas vacías
                            }
                        }
                    }
                }
            ], { maxTimeMS: 60000, allowDiskUse: true });
            return users; // Retornar la lista de usuarios con comentarios y respuestas
        }
        catch (error) {
            console.error("Error while fetching users and their comments:", error);
            throw error;
        }
    }
    // public async findByCommentId(commentIdFather: string): Promise<any> {
    //     const commentId = commentIdFather.toString();
    //     try {
    //         // Realizar una agregación para buscar un comentario específico
    //         const commentResult = await UserModel.aggregate([
    //             { $unwind: '$comments' },
    //             { 
    //                 $match: { 'comments._id': new mongoose.Types.ObjectId(commentId) } 
    //             },
    //             {
    //               $lookup: {
    //                 from: 'replies', // Buscar en la colección de respuestas
    //                 localField: 'comments._id',
    //                 foreignField: 'parent',
    //                 as: 'comments.replies' // Asociar respuestas a los comentarios
    //               }
    //             },
    //             {
    //               $unwind: {
    //                 path: '$comments.replies',
    //                 preserveNullAndEmptyArrays: true
    //               }
    //             },
    //             {
    //               $lookup: {
    //                 from: 'replies',
    //                 localField: 'comments.replies._id',
    //                 foreignField: 'parent',
    //                 as: 'comments.replies.nested_replies' // Asociar respuestas anidadas
    //               }
    //             },
    //             {
    //               $group: {
    //                 _id: {
    //                   user_id: '$_id',
    //                   comment_id: '$comments._id'
    //                 },
    //                 user_name: { $first: '$name' }, // Agrega el nombre del usuario si lo necesitas
    //                 comment: { $first: '$comments.comment' },
    //                 reactions: { $first: '$comments.reactions' },
    //                 replies: { $push: '$comments.replies' } // Agrupar respuestas
    //               }
    //             },
    //             {
    //               $project: {
    //                 _id: 0,
    //                 user_id: '$_id.user_id',
    //                 user_name: 1,
    //                 comment_id: '$_id.comment_id',
    //                 comment: 1,
    //                 reactions: 1,
    //                 replies: {
    //                   $cond: {
    //                     if: { $eq: [{ $arrayElemAt: ['$replies._id', 0] }, null] },
    //                     then: [],
    //                     else: '$replies' // Condicional para manejar respuestas vacías
    //                   }
    //                 }
    //               }
    //             }
    //           ], { maxTimeMS: 60000, allowDiskUse: true });
    //         // Retornar el primer resultado (o null si no se encuentra)
    //         return commentResult.length > 0 ? commentResult[0] : null;
    //     } catch (error) {
    //         console.error("Error while fetching comment by ID:", error);
    //         throw error;
    //     }
    // }
    async findByCommentId(commentIdFather) {
        // console.log("Comment ID recibido:", typeof commentIdFather);
        try {
            let commentId;
            // Manejar diferentes tipos de entrada
            if (typeof commentIdFather === 'string') {
                commentId = commentIdFather;
            }
            else {
                throw new Error('Formato de ID de comentario inválido');
            }
            // console.log("Comment ID procesado:", commentId);
            // Realizar la búsqueda con el ID procesado
            const commentResult = await UserModel.aggregate([
                { $unwind: '$comments' },
                {
                    $match: { 'comments._id': new mongoose.Types.ObjectId(commentId) }
                },
                {
                    $lookup: {
                        from: 'replies', // Buscar en la colección de respuestas
                        localField: 'comments._id',
                        foreignField: 'parent',
                        as: 'comments.replies' // Asociar respuestas a los comentarios
                    }
                },
                {
                    $unwind: {
                        path: '$comments.replies',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'replies',
                        localField: 'comments.replies._id',
                        foreignField: 'parent',
                        as: 'comments.replies.nested_replies' // Asociar respuestas anidadas
                    }
                },
                {
                    $group: {
                        _id: {
                            user_id: '$_id',
                            comment_id: '$comments._id'
                        },
                        user_name: { $first: '$name' }, // Agrega el nombre del usuario si lo necesitas
                        comment: { $first: '$comments.comment' },
                        reactions: { $first: '$comments.reactions' },
                        replies: { $push: '$comments.replies' } // Agrupar respuestas
                    }
                },
                {
                    $project: {
                        _id: 0,
                        user_id: '$_id.user_id',
                        user_name: 1,
                        comment_id: '$_id.comment_id',
                        comment: 1,
                        reactions: 1,
                        replies: {
                            $cond: {
                                if: { $eq: [{ $arrayElemAt: ['$replies._id', 0] }, null] },
                                then: [],
                                else: '$replies' // Condicional para manejar respuestas vacías
                            }
                        }
                    }
                }
            ], { maxTimeMS: 60000, allowDiskUse: true });
            return commentResult.length > 0 ? commentResult[0] : null;
        }
        catch (error) {
            console.error("Error al buscar comentario por ID:", error);
            throw error;
        }
    }
    // Método para eliminar un comentario o respuesta
    async deleteComment(idUser, commentId) {
        try {
            // Buscar el propietario del comentario
            const commentOwner = await UserModel.findOne({ 'comments._id': commentId });
            if ((commentOwner === null || commentOwner === void 0 ? void 0 : commentOwner._id) == idUser) {
                // Si el comentario pertenece al usuario, actualizar el comentario para marcarlo como "no disponible"
                const updatedUser = await UserModel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(idUser), 'comments._id': commentId }, { $set: { 'comments.$.comment': "comentario no disponible" } }, { new: true });
                return updatedUser; // Retornar el documento del usuario actualizado
            }
            else {
                // Buscar la respuesta en la colección de comentarios
                const reply = await CommentModel.findById(commentId);
                if ((reply === null || reply === void 0 ? void 0 : reply.id_owner) == idUser) {
                    // Si la respuesta pertenece al usuario, actualizarla para marcarla como "no disponible"
                    const updatedUser = await CommentModel.findByIdAndUpdate(commentId, { $set: { comment: "comentario no disponible" } }, { new: true });
                    return updatedUser; // Retornar el documento de la respuesta actualizada
                }
                return null; // Retornar null si no se encontró el comentario o respuesta
            }
        }
        catch (error) {
            throw error; // Lanzar error si ocurre alguna excepción
        }
    }
    // Método para actualizar un comentario o respuesta
    async updateCommentInMyDocument(idUser, commentId, comment) {
        //console.log("Updating comment:", comment.comment);
        try {
            // Buscar el propietario del comentario
            const commentOwner = await UserModel.findOne({ 'comments._id': commentId });
            //console.log("Comment owner:", commentOwner);
            // Buscar al usuario que realiza la actualización
            const user = await UserModel.findById(idUser);
            if (!user) {
                throw new Error("User not found"); // Lanza un error si el usuario no existe
            }
            if (commentOwner) {
                if ((commentOwner === null || commentOwner === void 0 ? void 0 : commentOwner._id) == idUser) {
                    // Si el comentario pertenece al usuario, actualizar el comentario
                    const updatedUser = await UserModel.findOneAndUpdate({
                        _id: idUser,
                        'comments._id': commentId
                    }, {
                        $set: { 'comments.$.comment': comment }
                    }, {
                        new: true
                    });
                    console.log("Updated user:", updatedUser);
                    return updatedUser; // Retornar el documento del usuario actualizado
                }
                else {
                    throw new Error("Comment does not belong to user"); // Lanza un error si el comentario no pertenece al usuario
                }
            }
            return null; // Retornar null si no se encontró el comentario
        }
        catch (error) {
            throw error; // Lanzar error si ocurre alguna excepción
        }
    }
    // Método para actualizar un comentario o respuesta
    async updateCommentInReplies(idUser, commentId, comment) {
        const reply = await CommentModel.findById(commentId);
        if (reply && (reply === null || reply === void 0 ? void 0 : reply.id_owner) === idUser) {
            const updatedReply = await CommentModel.findOneAndUpdate({ _id: commentId }, { $set: { comment: comment } }, { new: true });
            return updatedReply; // Retornar el documento de la respuesta actualizada
        }
        return null; // Retornar null si la respuesta no pertenece al usuario
    }
}
export default new CommentService;
