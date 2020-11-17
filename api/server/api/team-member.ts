import * as express from 'express';

import { signRequestForUpload } from '../aws-s3';

const router = express.Router();

// this express route /aws/get-signed-request-for-upload-to-s3 is agnostic to the value of the bucket's name.
router.post('/aws/get-signed-request-for-upload-to-s3', async (req, res, next) => {
  try {
    const { fileName, fileType, prefix, bucket } = req.body;

    const returnData = await signRequestForUpload({
      fileName,
      fileType,
      prefix,
      bucket,
    });

    res.json(returnData);
  } catch (err) {
    next(err);
  }
});

export default router;


/**
 * Notes:
 * - we place Express routes related to a Team Member user in /api/server/api/team-member.ts.
 */