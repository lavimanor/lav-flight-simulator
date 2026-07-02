export class ModuleManager {
  constructor(engine) {
    if (!engine) {
      throw new Error("ModuleManager initialization requires an active Engine instance.");
    }
    this.engine = engine;
    this.modules = new Map();
  }
  register(name, moduleInstance) {
    if (!name || typeof name !== 'string') {
      throw new Error("Invalid registration: module name must be a non-empty string.");
    }
    if (this.modules.has(name)) {
      console.warn(`Module duplicate: '${name}' is already loaded. Action aborted.`);
      return;
    }
    this.modules.set(name, moduleInstance);
    this.engine.addModule(moduleInstance);
  }
  get(name) {
    return this.modules.get(name);
  }
  initAll() {
    for (const [name, module] of this.modules.entries()) {
      if (typeof module.init === 'function') {
        module.init(this.engine);
      }
    }
  }
}