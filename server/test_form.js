async function run() {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('machine_id', '1');
    form.append('template_id', '1');
    form.append('shift', 'A');
    form.append('values', '[{"item_id": 1, "actual_value": "10"}]');
    form.append('comments', 'Test');
    form.append('part_name', '');
    form.append('line_speed', '');

    try {
        const res = await fetch('http://localhost:3000/api/checklists', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Im9wZXJhdG9yIiwidXNlcm5hbWUiOiJvcGVyYXRvciIsImlhdCI6MTc4Njk1NzIxNH0.m2nQ2mvAcLfrXGXtuB9I36kCor8o2yPYKjRG5OBWJFg',
                ...form.getHeaders()
            },
            body: form
        });
        const d = await res.text();
        console.log('STATUS:', res.status, 'BODY:', d);
    } catch(e) {
        console.error(e);
    }
}
run();
