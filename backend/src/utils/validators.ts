import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createOrganizationSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
});

export const createExpenseSchema = Joi.object({
  description: Joi.string().min(1).max(200).required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().optional(),
  date: Joi.date().required(),
  splits: Joi.array()
    .items(
      Joi.object({
        user_id: Joi.number().integer().positive().required(),
        share_amount: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required(),
  notes: Joi.string().max(1000).optional(),
});

export const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'member').default('member'),
});

export const passwordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};
