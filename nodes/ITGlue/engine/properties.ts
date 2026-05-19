import { INodeProperties } from 'n8n-workflow';
import { ResourceDescriptor, FieldDescriptor, OperationName } from '../registry/types';

const PRIORITY_ORDER: OperationName[] = ['getAll', 'get', 'create', 'update', 'delete', 'bulkUpdate', 'bulkDelete'];

function operationDefault(ops: OperationName[]): OperationName {
  for (const op of PRIORITY_ORDER) {
    if (ops.includes(op)) return op;
  }
  return ops[0];
}

function buildOperationOption(op: OperationName, displayName: string): INodeProperties['options'] extends Array<infer T> | undefined ? T : never {
  const map: Record<OperationName, { name: string; value: string; action: string; description: string }> = {
    getAll: {
      name: 'Get Many',
      value: 'getAll',
      action: 'Get many ' + displayName + ' records',
      description: 'Retrieve many ' + displayName + ' records (with optional filters)',
    },
    get: {
      name: 'Get',
      value: 'get',
      action: 'Get a ' + displayName,
      description: 'Retrieve a single ' + displayName + ' by ID',
    },
    create: {
      name: 'Create',
      value: 'create',
      action: 'Create a ' + displayName,
      description: 'Create a new ' + displayName,
    },
    update: {
      name: 'Update',
      value: 'update',
      action: 'Update a ' + displayName,
      description: 'Update an existing ' + displayName,
    },
    delete: {
      name: 'Delete',
      value: 'delete',
      action: 'Delete a ' + displayName,
      description: 'Delete a ' + displayName + ' by ID',
    },
    bulkUpdate: {
      name: 'Bulk Update',
      value: 'bulkUpdate',
      action: 'Bulk update ' + displayName + ' records',
      description: 'Update multiple ' + displayName + ' records in one request',
    },
    bulkDelete: {
      name: 'Bulk Delete',
      value: 'bulkDelete',
      action: 'Bulk delete ' + displayName + ' records',
      description: 'Delete multiple ' + displayName + ' records in one request',
    },
  };
  return map[op] as any;
}

function fieldTypeDefault(type: FieldDescriptor['type']): unknown {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'dateTime': return '';
    case 'json': return {};
    case 'options': return '';
    default: return '';
  }
}

function n8nType(type: FieldDescriptor['type']): string {
  return type; // 'string','number','boolean','dateTime','json','options' map identically
}

function buildFieldProperty(f: FieldDescriptor, resourceName: string): INodeProperties {
  const operations = f.onOperations ?? ['create', 'update'];

  const prop: INodeProperties = {
    displayName: f.displayName,
    name: f.name,
    type: n8nType(f.type) as INodeProperties['type'],
    default: f.default !== undefined ? f.default : fieldTypeDefault(f.type),
    required: !!f.required,
    displayOptions: {
      show: {
        resource: [resourceName],
        operation: operations,
      },
    },
  } as INodeProperties;

  if (f.description !== undefined) {
    prop.description = f.description;
  }

  if (f.type === 'options') {
    if (f.loadOptionsMethod) {
      (prop as any).typeOptions = { loadOptionsMethod: f.loadOptionsMethod };
    } else {
      prop.options = f.options ?? [];
    }
  }

  if (f.password) {
    const existing = (prop as any).typeOptions ?? {};
    (prop as any).typeOptions = { ...existing, password: true };
  }

  return prop;
}

export function buildResourceProperties(d: ResourceDescriptor): INodeProperties[] {
  const props: INodeProperties[] = [];

  // 1. Operation dropdown
  const opOptions = d.operations
    .map(op => buildOperationOption(op, d.displayName))
    .sort((a, b) => (a as any).name.localeCompare((b as any).name));

  props.push({
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: [d.name],
      },
    },
    options: opOptions as INodeProperties['options'],
    default: operationDefault(d.operations),
  });

  // 2. ID param for get/update/delete
  const idOps: OperationName[] = (['get', 'update', 'delete'] as OperationName[]).filter(op =>
    d.operations.includes(op),
  );
  if (idOps.length > 0) {
    const idParamName = d.idParam ?? (d.name + 'Id');
    props.push({
      displayName: d.displayName + ' ID',
      name: idParamName,
      type: 'string',
      required: true,
      default: '',
      description: 'The ID of the ' + d.displayName,
      displayOptions: {
        show: {
          resource: [d.name],
          operation: idOps,
        },
      },
    });
  }

  // 3. Field params
  for (const f of d.fields) {
    props.push(buildFieldProperty(f, d.name));
  }

  // 4. getAll extras
  if (d.operations.includes('getAll')) {
    props.push({
      displayName: 'Return All',
      name: 'returnAll',
      type: 'boolean',
      default: false,
      description: 'Whether to return all results or only up to a given limit',
      displayOptions: {
        show: {
          resource: [d.name],
          operation: ['getAll'],
        },
      },
    });

    props.push({
      displayName: 'Limit',
      name: 'limit',
      type: 'number',
      typeOptions: { minValue: 1 },
      default: 50,
      description: 'Max number of results to return',
      displayOptions: {
        show: {
          resource: [d.name],
          operation: ['getAll'],
          returnAll: [false],
        },
      },
    });

    if (d.filters && d.filters.length > 0) {
      const filterOptions = d.filters.map(f => {
        const opt: Record<string, unknown> = {
          displayName: f.displayName,
          name: f.name,
          type: n8nType(f.type),
          default: f.default !== undefined ? f.default : fieldTypeDefault(f.type),
        };
        if (f.description !== undefined) {
          opt.description = f.description;
        }
        return opt;
      });

      props.push({
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        default: {},
        displayOptions: {
          show: {
            resource: [d.name],
            operation: ['getAll'],
          },
        },
        options: filterOptions as unknown as INodeProperties['options'],
      });
    }

    if (d.includes && d.includes.length > 0) {
      const includeOps = (['get', 'getAll'] as OperationName[]).filter(op =>
        d.operations.includes(op),
      );
      const includeOptions = [...d.includes]
        .sort((a, b) => a.localeCompare(b))
        .map(i => ({ name: i, value: i }));

      props.push({
        displayName: 'Include',
        name: 'include',
        type: 'multiOptions',
        default: [],
        description: 'Related resources to embed',
        displayOptions: {
          show: {
            resource: [d.name],
            operation: includeOps,
          },
        },
        options: includeOptions,
      });
    }
  }

  // 5. orgScoped
  if (d.orgScoped) {
    const orgOps = (['create', 'getAll'] as OperationName[]).filter(op =>
      d.operations.includes(op),
    );
    props.push({
      displayName: 'Organization Name or ID',
      name: 'organizationId',
      type: 'options',
      typeOptions: { loadOptionsMethod: 'getOrganizations' },
      default: '',
      description:
        'Scope to an organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      displayOptions: {
        show: {
          resource: [d.name],
          operation: orgOps,
        },
      },
    });
  }

  return props;
}
