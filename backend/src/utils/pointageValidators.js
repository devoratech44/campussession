// backend/src/utils/pointageValidators.js
const { body } = require('express-validator');

const SIG_MAX_CHARS = (Number(process.env.SIGNATURE_MAX_KB) || 300) * 1400; // base64 ≈ 1,37 × taille

const signatureRule = (optional) => {
  let chain = body('signature');
  if (optional) chain = chain.optional({ nullable: true, checkFalsy: true });
  return chain
    .isString().withMessage('Signature invalide.')
    .matches(/^data:image\/(png|jpeg);base64,/).withMessage('Signature invalide.')
    .isLength({ max: SIG_MAX_CHARS }).withMessage('Signature trop volumineuse.');
};

exports.signatureOnly = [body('seanceId').isInt({ min: 1 }).withMessage('Séance invalide.').toInt(), signatureRule(false)];

exports.pointer = [
  body('token').optional().isString().isLength({ min: 10, max: 128 }),
  body('k').optional().isString().isLength({ max: 64 }),
  body('proof').optional().isString().isLength({ max: 128 }),
  body('code').optional().isString().trim().isLength({ min: 4, max: 12 }),
  signatureRule(true),
];

exports.pointerPour = [signatureRule(true)];