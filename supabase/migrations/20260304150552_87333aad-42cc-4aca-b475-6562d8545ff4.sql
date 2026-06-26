
-- Seed sample campaign with 100 targets and realistic data

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_template_id uuid;
  v_campaign_id uuid;
  v_departments text[] := ARRAY['Finanzas', 'Recursos Humanos', 'TI', 'Marketing', 'Ventas', 'Legal', 'Operaciones', 'Soporte'];
  v_first_names text[] := ARRAY['Carlos', 'María', 'Juan', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía', 'Andrés', 'Valentina', 'Miguel', 'Camila', 'Luis', 'Isabella', 'Fernando', 'Gabriela', 'Roberto', 'Daniela', 'Jorge', 'Natalia'];
  v_last_names text[] := ARRAY['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos'];
  v_fname text;
  v_lname text;
  v_dept text;
  v_email text;
  v_token text;
  v_sent_at timestamptz;
  v_clicked boolean;
  v_reported boolean;
  v_clicked_at timestamptz;
  v_reported_at timestamptz;
  v_total_clicked int := 0;
  v_total_reported int := 0;
  i int;
BEGIN
  -- Get first admin user
  SELECT ur.user_id INTO v_user_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT ur.user_id INTO v_user_id FROM public.user_roles ur LIMIT 1;
  END IF;

  -- Create sample organization
  INSERT INTO public.organizations (name, contact_email, created_by)
  VALUES ('Acme Corp Demo', 'admin@acmecorp.demo', v_user_id)
  RETURNING id INTO v_org_id;

  -- Create sample template
  INSERT INTO public.phishing_templates (name, category, subject, sender_name, sender_email, html_content, description, difficulty, created_by)
  VALUES (
    'Actualización de Seguridad Urgente',
    'credential_harvesting',
    'Acción Requerida: Actualiza tu contraseña ahora',
    'Soporte TI',
    'soporte@empresa-segura.com',
    '<html><body><h2>Estimado empleado,</h2><p>Hemos detectado actividad sospechosa en tu cuenta. Por tu seguridad, necesitamos que actualices tu contraseña inmediatamente.</p><p><a href="{{TRACKING_URL}}" style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Actualizar Contraseña</a></p><p>Si no realizas esta acción en las próximas 24 horas, tu cuenta será suspendida.</p><br><p>Equipo de Soporte TI</p></body></html>',
    'Simula un correo urgente de actualización de contraseña del departamento de TI',
    'medium',
    v_user_id
  )
  RETURNING id INTO v_template_id;

  -- Create sample campaign (completed)
  INSERT INTO public.campaigns (name, description, status, organization_id, template_id, created_by, started_at, completed_at, scheduled_at)
  VALUES (
    'Campaña Demo Q1 2026',
    'Campaña de simulación de phishing con 100 empleados de Acme Corp para evaluar nivel de concientización',
    'completed',
    v_org_id,
    v_template_id,
    v_user_id,
    now() - interval '7 days',
    now() - interval '1 day',
    now() - interval '8 days'
  )
  RETURNING id INTO v_campaign_id;

  -- Insert 100 targets with varied data
  FOR i IN 1..100 LOOP
    v_fname := v_first_names[1 + (i % 20)];
    v_lname := v_last_names[1 + ((i * 7) % 20)];
    v_dept := v_departments[1 + (i % 8)];
    v_email := lower(v_fname) || '.' || lower(v_lname) || i::text || '@acmecorp.demo';
    v_token := encode(gen_random_bytes(16), 'hex');
    v_sent_at := now() - interval '7 days' + (i * interval '2 minutes');

    -- 35% click rate overall, varies by department
    -- Finanzas/Marketing higher click rate, TI lower
    v_clicked := CASE
      WHEN v_dept IN ('Finanzas', 'Marketing', 'Ventas') THEN random() < 0.50
      WHEN v_dept IN ('TI', 'Legal') THEN random() < 0.15
      ELSE random() < 0.30
    END;

    -- 25% report rate, TI reports more
    v_reported := CASE
      WHEN v_dept = 'TI' THEN random() < 0.60
      WHEN v_dept = 'Legal' THEN random() < 0.40
      ELSE random() < 0.20
    END;

    v_clicked_at := CASE WHEN v_clicked THEN v_sent_at + (random() * interval '48 hours') ELSE NULL END;
    v_reported_at := CASE WHEN v_reported THEN v_sent_at + (random() * interval '24 hours') ELSE NULL END;

    IF v_clicked THEN v_total_clicked := v_total_clicked + 1; END IF;
    IF v_reported THEN v_total_reported := v_total_reported + 1; END IF;

    INSERT INTO public.campaign_targets (campaign_id, email, full_name, department, unique_token, sent_at, clicked_at, reported_at)
    VALUES (v_campaign_id, v_email, v_fname || ' ' || v_lname, v_dept, v_token, v_sent_at, v_clicked_at, v_reported_at);
  END LOOP;

  -- Insert campaign results
  INSERT INTO public.campaign_results (campaign_id, total_targets, emails_sent, emails_clicked, emails_reported, click_rate, report_rate)
  VALUES (
    v_campaign_id,
    100,
    100,
    v_total_clicked,
    v_total_reported,
    v_total_clicked::numeric,
    v_total_reported::numeric
  );
END $$;
