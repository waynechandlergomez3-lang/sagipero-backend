import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types/custom';
import { upload } from '../utils/upload';
import fs from 'fs';

interface FileAuthRequest extends AuthRequest {
  file?: Express.Multer.File;
}

export const updateMedicalProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      specialCircumstances,
      medicalConditions,
      allergies,
      bloodType,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user?.id },
      data: {
        specialCircumstances,
        medicalConditions,
        allergies,
        bloodType,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation
      },
      select: {
        id: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating medical profile:', error);
    res.status(500).json({ error: 'Failed to update medical profile' });
  }
};

export const getCommonMedicalConditions = async (_req: AuthRequest, res: Response) => {
  try {
    const conditions = await prisma.commonMedicalCondition.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(conditions);
  } catch (error) {
    console.error('Error fetching medical conditions:', error);
    res.status(500).json({ error: 'Failed to fetch medical conditions' });
  }
};

export const getCommonAllergies = async (_req: AuthRequest, res: Response) => {
  try {
    const allergies = await prisma.commonAllergy.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(allergies);
  } catch (error) {
    console.error('Error fetching allergies:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
};

export const uploadDocument = async (req: FileAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { type } = req.body;
    const file = req.file;

    console.log('uploadDocument called - userId:', req.user?.id, 'body:', req.body);
    if (file) {
      console.log('Received file:', { originalname: file.originalname, mimetype: file.mimetype, size: file.size, path: (file as any).path });
    } else {
      console.log('No file received in request');
    }

    if (!file || !req.user?.id) {
      return res.status(400).json({ error: 'No file uploaded or user not authenticated' });
    }

    // multer may store files on disk (dest) or in memory (buffer). Ensure we provide a buffer to the upload util.
    let fileBuffer: Buffer | undefined = undefined;
    if ((file as any).buffer) {
      fileBuffer = (file as any).buffer;
    } else if ((file as any).path) {
      const diskPath = (file as any).path as string;
      try {
        fileBuffer = await fs.promises.readFile(diskPath);
      } catch (err) {
        console.error('Failed to read uploaded file from disk:', err);
        return res.status(500).json({ error: 'Failed to read uploaded file' });
      }
    }

    if (!fileBuffer) {
      console.error('No buffer available for uploaded file');
      return res.status(500).json({ error: 'No file buffer available' });
    }

    // Build object matching upload util expectation
    const uploadFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: (file as any).encoding || '7bit',
      mimetype: file.mimetype,
      buffer: fileBuffer,
      size: file.size
    } as any;

    const fileUrl = await upload(uploadFile);

    const document = await prisma.userDocument.create({
      data: {
        userId: req.user.id,
        type,
        fileUrl,
        verified: false
      },
      select: {
        id: true,
        userId: true,
        type: true,
        fileUrl: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('Created UserDocument:', document);

    // if multer saved a disk file, optionally remove it now
    if ((file as any).path) {
      const diskPath = (file as any).path as string;
      fs.promises.unlink(diskPath).catch(err => console.warn('Failed to remove temp upload file:', err));
    }

    res.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const verifyDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { verified } = req.body;

    const document = await prisma.userDocument.update({
      where: { id: documentId },
      data: { verified },
      select: {
        id: true,
        userId: true,
        type: true,
        fileUrl: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(document);
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
};

export const getUserDocuments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const docs = await prisma.userDocument.findMany({
      where: { userId: req.user.id },
      select: { id: true, type: true, fileUrl: true, verified: true, createdAt: true }
    });

    return res.json(docs);
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
};
