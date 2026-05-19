import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { ResourceDescriptor, FieldDescriptor, OperationName } from '../registry/types';

const PRIORITY_ORDER: OperationName[] = ['getAll', 'get', 'create', 'update', 'delete', 'bulkUpdate', 'bulkDelete'];

function operationDefault(ops: OperationName[]): OperationName {
  for (const op of PRIORITY_ORDER) {
    if (ops.includes(op)) return op;
  }
  return ops[0];
}

// M2: typed return type, remove as any cast
function buildOperationOption(op: OperationName, displayName: string): INodePropertyOptions {
  const map: Record<OperationName, INodePropertyOptions> = {
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
  return map[op];
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

// M1: typed N8N_TYPE_MAP
const N8N_TYPE_MAP: Record<FieldDescriptor['type'], INodeProperties['type']> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  dateTime: 'dateTime',
  json: 'json',
  options: 'options',
};

function n8nType(type: FieldDescriptor['type']): INodeProperties['type'] {
  return N8N_TYPE_MAP[type];
}

// I2: toTitleCase helper for include option names
function toTitleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildFieldProperty(f: FieldDescriptor, resourceName: string, operations: OperationName[]): INodeProperties {
  const prop: INodeProperties = {
    displayName: f.displayName,
    name: f.name,
    type: n8nType(f.type),
    default: f.default !== undefined ? f.default : fieldTypeDefault(f.type),
    // I4: only emit required when true
    ...(f.required ? { required: true } : {}),
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
  // C1: guard empty operations
  if (d.operations.length === 0) {
    throw new Error(`ResourceDescriptor '${d.name}' has no operations. At least one operation is required.`);
  }

  const props: INodeProperties[] = [];

  // 1. Operation dropdown
  const opOptions = d.operations
    .map(op => buildOperationOption(op, d.displayName))
    .sort((a, b) => a.name.localeCompare(b.name));

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
  const idParamName = d.idParam ?? (d.name + 'Id');
  if (idOps.length > 0) {
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

  // I1: reserved-name collision guard
  const reserved = new Set(['operation', 'returnAll', 'limit', 'filters', 'include', 'organizationId', idParamName]);
  for (const f of d.fields) {
    if (reserved.has(f.name)) {
      throw new Error(`ResourceDescriptor '${d.name}': field name '${f.name}' collides with a reserved param name.`);
    }
    const fieldOps = f.onOperations ?? (['create', 'update'] as OperationName[]);
    props.push(buildFieldProperty(f, d.name, fieldOps));
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
      // I3: trailing period
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
  }

  // C2: include emitted for get and/or getAll (outside the getAll guard)
  if (d.includes && d.includes.length > 0) {
    const includeOps = (['get', 'getAll'] as OperationName[]).filter(op => d.operations.includes(op));
    if (includeOps.length > 0) {
      props.push({
        displayName: 'Include',
        name: 'include',
        type: 'multiOptions',
        default: [],
        description: 'Related resources to embed in the response',
        options: [...d.includes].sort((a, b) => a.localeCompare(b)).map(i => ({ name: toTitleCase(i), value: i })),
        displayOptions: { show: { resource: [d.name], operation: includeOps } },
      });
    }
  }

  // 5. orgScoped
  if (d.orgScoped) {
    // I5: only emit when at least one of create/getAll is present
    const orgOps = (['create', 'getAll'] as OperationName[]).filter(op =>
      d.operations.includes(op),
    );
    if (orgOps.length > 0) {
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
  }

  return props;
}
