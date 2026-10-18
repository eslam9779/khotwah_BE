import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { CreateFileInput } from './file.schema';

export async function listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const files = await prisma.teacherFile.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, files);
  } catch (err) { next(err); }
}

export async function createFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateFileInput;
    const teacherId = req.teacherProfileId!;
    const file = await prisma.teacherFile.create({ data: { ...data, teacherId } });
    sendSuccess(res, file, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId } = req.params;
    const teacherId = req.teacherProfileId!;
    const existing = await prisma.teacherFile.findFirst({ where: { id: fileId, teacherId } });
    if (!existing) throw new AppError('File not found', 'NOT_FOUND', 404);
    await prisma.teacherFile.delete({ where: { id: fileId } });
    sendSuccess(res, null, { message: 'File deleted' });
  } catch (err) { next(err); }
}
