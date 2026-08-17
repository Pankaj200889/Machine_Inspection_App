const db = require('./database');
db.query("INSERT INTO machines (id, machine_no, line_no, model, prod_plan, mct, working_hours) VALUES (1, 'M1', 'L1', 'ModelX', 100, 10, 8)")
.then(() => {
    return db.query("INSERT INTO checklist_templates (id, template_name) VALUES (1, 'T1')");
})
.then(() => {
    console.log('Inserted machine and template');
    process.exit(0);
})
.catch(console.error);
