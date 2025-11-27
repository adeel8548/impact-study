-- RLS Policies for Profiles table
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for Classes table
CREATE POLICY "classes_select_school"
  ON public.classes FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "classes_admin_all"
  ON public.classes FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for Students table
CREATE POLICY "students_select_school"
  ON public.students FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Student Attendance table
CREATE POLICY "attendance_select_school"
  ON public.student_attendance FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "attendance_insert_teacher"
  ON public.student_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for Teacher Attendance table
CREATE POLICY "teacher_attendance_select_school"
  ON public.teacher_attendance FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Student Fees table
CREATE POLICY "fees_select_school"
  ON public.student_fees FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Teacher Salary table
CREATE POLICY "salary_select_school"
  ON public.teacher_salary FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );
