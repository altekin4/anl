import Joi from 'joi';
export declare const chatMessageSchema: Joi.ObjectSchema<any>;
export declare const userRegistrationSchema: Joi.ObjectSchema<any>;
export declare const universitySearchSchema: Joi.ObjectSchema<any>;
export declare const departmentSearchSchema: Joi.ObjectSchema<any>;
export declare const netCalculationSchema: Joi.ObjectSchema<any>;
export declare const validate: (schema: Joi.ObjectSchema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.d.ts.map