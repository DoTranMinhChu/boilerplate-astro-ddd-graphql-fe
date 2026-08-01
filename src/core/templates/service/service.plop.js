export default function (plop) {
  plop.setGenerator('entity', {
    description: 'Generate entity file with graphql and service',
    prompts: [
      {
        type: 'input',
        name: 'module',
        message: 'Enter module name',
      },
      {
        type: 'input',
        name: 'service',
        message: 'Enter service name',
      },
      {
        type: 'input',
        name: 'display',
        message: 'Enter display name',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{rootPath}}/src/shared/services/{{camelCase module}}/{{camelCase service}}.service.ts',
        templateFile: 'service.template.hbs',
        data: { rootPath: process.cwd() },
      },
    ],
  });
}
