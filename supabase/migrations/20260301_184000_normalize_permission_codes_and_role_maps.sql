-- Normalize permission codes used by application logic and align role mappings.
-- Target: txwyjorsgdiwbvlqbjpy

with permission_defs(module, action, code, name, description) as (
  values
    ('dashboard', '*', 'dashboard.*', 'Dashboard Wildcard', 'Wildcard access for dashboard routes'),
    ('dashboard', 'hubdin.access', 'dashboard.hubdin.access', 'Hubdin Dashboard Access', 'Access hubdin dashboard'),
    ('dashboard', 'operator.access', 'dashboard.operator.access', 'Operator Dashboard Access', 'Access operator dashboard'),
    ('dashboard', 'kaprog.access', 'dashboard.kaprog.access', 'Kaprog Dashboard Access', 'Access kaprog dashboard'),
    ('dashboard', 'pembimbing-sekolah.access', 'dashboard.pembimbing-sekolah.access', 'Pembimbing Sekolah Dashboard Access', 'Access school supervisor dashboard'),
    ('dashboard', 'pembimbing-perusahaan.access', 'dashboard.pembimbing-perusahaan.access', 'Pembimbing Perusahaan Dashboard Access', 'Access company supervisor dashboard'),
    ('dashboard', 'siswa.access', 'dashboard.siswa.access', 'Siswa Dashboard Access', 'Access student dashboard'),
    ('dashboard', 'ks.access', 'dashboard.ks.access', 'KS Dashboard Access', 'Access KS dashboard'),

    ('users', 'manage', 'users.manage', 'Manage Users', 'Manage user and role assignments'),
    ('users', '*', 'users.*', 'Users Wildcard', 'Wildcard for users module'),

    ('rbac', 'manage', 'rbac.manage', 'Manage RBAC', 'Manage role-permission mapping'),
    ('rbac', '*', 'rbac.*', 'RBAC Wildcard', 'Wildcard for RBAC module'),

    ('settings', 'manage', 'settings.manage', 'Manage Settings', 'Manage application settings'),
    ('settings', '*', 'settings.*', 'Settings Wildcard', 'Wildcard for settings module'),

    ('students', 'read', 'students.read', 'Read Students', 'Read student data'),
    ('students', 'view', 'students.view', 'View Students', 'View student data'),
    ('students', 'write', 'students.write', 'Write Students', 'Create/update student data'),
    ('students', 'create', 'students.create', 'Create Students', 'Create student data'),
    ('students', 'update', 'students.update', 'Update Students', 'Update student data'),
    ('students', 'delete', 'students.delete', 'Delete Students', 'Delete student data'),
    ('students', 'manage', 'students.manage', 'Manage Students', 'Manage all student operations'),
    ('students', '*', 'students.*', 'Students Wildcard', 'Wildcard for students module'),

    ('placements', 'read', 'placements.read', 'Read Placements', 'Read placement data'),
    ('placements', 'view', 'placements.view', 'View Placements', 'View placement data'),
    ('placements', 'manage', 'placements.manage', 'Manage Placements', 'Manage placement operations'),
    ('placements', '*', 'placements.*', 'Placements Wildcard', 'Wildcard for placements module'),

    ('companies', 'read', 'companies.read', 'Read Companies', 'Read company data'),
    ('companies', 'view', 'companies.view', 'View Companies', 'View company data'),
    ('companies', 'manage', 'companies.manage', 'Manage Companies', 'Manage company operations'),
    ('companies', '*', 'companies.*', 'Companies Wildcard', 'Wildcard for companies module'),

    ('supervisors', 'manage', 'supervisors.manage', 'Manage Supervisors', 'Manage supervisor assignments'),
    ('supervisors', '*', 'supervisors.*', 'Supervisors Wildcard', 'Wildcard for supervisors module'),

    ('kaprog', '*', 'kaprog.*', 'Kaprog Wildcard', 'Wildcard for kaprog operations'),

    ('attendance', 'read', 'attendance.read', 'Read Attendance', 'Read attendance records'),
    ('attendance', 'view', 'attendance.view', 'View Attendance', 'View attendance records'),
    ('attendance', 'write', 'attendance.write', 'Write Attendance', 'Create/update attendance records'),
    ('attendance', 'create', 'attendance.create', 'Create Attendance', 'Create attendance records'),
    ('attendance', 'update', 'attendance.update', 'Update Attendance', 'Update attendance records'),
    ('attendance', 'manage', 'attendance.manage', 'Manage Attendance', 'Manage attendance records'),
    ('attendance', '*', 'attendance.*', 'Attendance Wildcard', 'Wildcard for attendance module'),

    ('journals', 'read', 'journals.read', 'Read Journals', 'Read journal records'),
    ('journals', 'view', 'journals.view', 'View Journals', 'View journal records'),
    ('journals', 'write', 'journals.write', 'Write Journals', 'Create/update journals'),
    ('journals', 'create', 'journals.create', 'Create Journals', 'Create journal records'),
    ('journals', 'update', 'journals.update', 'Update Journals', 'Update journal records'),
    ('journals', 'delete', 'journals.delete', 'Delete Journals', 'Delete journal records'),
    ('journals', 'validate', 'journals.validate', 'Validate Journals', 'Validate submitted journals'),
    ('journals', 'approve', 'journals.approve', 'Approve Journals', 'Approve journals'),
    ('journals', 'review', 'journals.review', 'Review Journals', 'Review journals'),
    ('journals', 'manage', 'journals.manage', 'Manage Journals', 'Manage all journal operations'),
    ('journals', '*', 'journals.*', 'Journals Wildcard', 'Wildcard for journals module'),

    ('grades', 'manage', 'grades.manage', 'Manage Grades', 'Manage student grading'),
    ('grades', 'view', 'grades.view', 'View Grades', 'View grade records'),
    ('grades', 'create', 'grades.create', 'Create Grades', 'Create grade records'),
    ('grades', 'update', 'grades.update', 'Update Grades', 'Update grade records'),
    ('grades', '*', 'grades.*', 'Grades Wildcard', 'Wildcard for grades module'),

    ('supervision', 'handover.*', 'supervision.handover.*', 'Supervision Handover Wildcard', 'Handle student handover/pickup workflows'),

    ('reports', 'view', 'reports.view', 'View Reports', 'View reports'),
    ('reports', 'upload', 'reports.upload', 'Upload Reports', 'Upload reports')
)
insert into public.permissions (module, action, code, name, description, updated_at)
select module, action, lower(code), name, description, now()
from permission_defs
on conflict (module, action) do update
set code = excluded.code,
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

update public.permissions
set code = lower(code)
where code is not null
  and code <> lower(code);

with role_permission_defs(role_slug, permission_code) as (
  values
    ('hubdin', 'dashboard.*'),
    ('hubdin', 'dashboard.hubdin.access'),
    ('hubdin', 'users.*'),
    ('hubdin', 'rbac.*'),
    ('hubdin', 'settings.*'),
    ('hubdin', 'students.*'),
    ('hubdin', 'placements.*'),
    ('hubdin', 'companies.*'),
    ('hubdin', 'supervisors.*'),
    ('hubdin', 'kaprog.*'),
    ('hubdin', 'attendance.*'),
    ('hubdin', 'journals.*'),
    ('hubdin', 'grades.*'),
    ('hubdin', 'supervision.handover.*'),
    ('hubdin', 'reports.view'),
    ('hubdin', 'reports.upload'),

    ('admin', 'dashboard.*'),
    ('admin', 'dashboard.hubdin.access'),
    ('admin', 'users.*'),
    ('admin', 'rbac.*'),
    ('admin', 'settings.*'),
    ('admin', 'students.*'),
    ('admin', 'placements.*'),
    ('admin', 'companies.*'),
    ('admin', 'supervisors.*'),
    ('admin', 'kaprog.*'),
    ('admin', 'attendance.*'),
    ('admin', 'journals.*'),
    ('admin', 'grades.*'),
    ('admin', 'supervision.handover.*'),
    ('admin', 'reports.view'),
    ('admin', 'reports.upload'),

    ('operator', 'dashboard.operator.access'),
    ('operator', 'students.read'),
    ('operator', 'students.view'),
    ('operator', 'students.write'),
    ('operator', 'placements.read'),
    ('operator', 'placements.view'),
    ('operator', 'companies.read'),
    ('operator', 'companies.view'),
    ('operator', 'reports.view'),

    ('kaprog', 'dashboard.kaprog.access'),
    ('kaprog', 'students.read'),
    ('kaprog', 'students.view'),
    ('kaprog', 'placements.manage'),
    ('kaprog', 'companies.manage'),
    ('kaprog', 'supervisors.manage'),
    ('kaprog', 'kaprog.*'),

    ('pembimbing_sekolah', 'dashboard.pembimbing-sekolah.access'),
    ('pembimbing_sekolah', 'supervision.handover.*'),
    ('pembimbing_sekolah', 'journals.read'),
    ('pembimbing_sekolah', 'journals.view'),
    ('pembimbing_sekolah', 'journals.validate'),
    ('pembimbing_sekolah', 'attendance.read'),
    ('pembimbing_sekolah', 'attendance.view'),

    ('pembimbing_perusahaan', 'dashboard.pembimbing-perusahaan.access'),
    ('pembimbing_perusahaan', 'grades.manage'),
    ('pembimbing_perusahaan', 'grades.*'),
    ('pembimbing_perusahaan', 'grades.view'),
    ('pembimbing_perusahaan', 'journals.read'),
    ('pembimbing_perusahaan', 'journals.view'),
    ('pembimbing_perusahaan', 'journals.validate'),
    ('pembimbing_perusahaan', 'attendance.read'),
    ('pembimbing_perusahaan', 'attendance.view'),

    ('siswa', 'dashboard.siswa.access'),
    ('siswa', 'attendance.read'),
    ('siswa', 'attendance.view'),
    ('siswa', 'attendance.write'),
    ('siswa', 'journals.read'),
    ('siswa', 'journals.view'),
    ('siswa', 'journals.write'),
    ('siswa', 'reports.upload'),
    ('siswa', 'reports.view'),

    ('ks', 'dashboard.ks.access'),
    ('ks', 'reports.view')
)
insert into public.role_permissions (role_id, role, permission_id, granted, updated_at)
select
  r.id as role_id,
  r.slug as role,
  p.id as permission_id,
  true as granted,
  now() as updated_at
from role_permission_defs d
join public.roles r
  on lower(coalesce(r.slug::text, r.name)) = lower(d.role_slug)
join public.permissions p
  on lower(p.code) = lower(d.permission_code)
on conflict (role_id, permission_id) do update
set granted = true,
    role = excluded.role,
    updated_at = now();

update public.role_permissions rp
set role = r.slug,
    updated_at = now()
from public.roles r
where rp.role_id = r.id
  and r.slug is not null
  and rp.role is distinct from r.slug;
