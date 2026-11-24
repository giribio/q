# Moodle import and course assembly guide

This package is an **import-ready content bundle**, not a native Moodle `.mbz` backup. A valid `.mbz` requires a Moodle instance to generate and should be created after the course shell is configured.

## Recommended course settings
- Format: Topics format
- Sections: General + Weeks 1–12
- Completion tracking: enabled
- Activity completion: require view for lecture pages; require submission for practicals
- Gradebook: use the weights in `docs/Assessment_Rubric.md`
- Groups: optional; use cohort groups if faculty mentors are assigned

## Import question bank
1. In Moodle, open Question bank → Import.
2. Select GIFT format.
3. Upload `question_banks/Quantum_Academy_Question_Bank.gift`.
4. Confirm category `Quantum Computing Academy`.
5. Review imported questions before making quizzes available.

## Add weekly resources
Use `Course_Structure.csv` as the course assembly manifest. Create 12 weekly sections and upload the corresponding lecture script, slide outline, `.ipynb` and `.qs` files. Moodle core does not execute Jupyter notebooks or Q# files natively; link notebooks to JupyterHub or provide downloads and link Q# to the supported local toolchain.

## Suggested quiz configuration
- 5–10 questions per weekly quiz.
- Randomise question order and, where suitable, question selection.
- Use multiple attempts for formative quizzes.
- Apply a time limit only to summative assessments.
- Include feedback explaining why the correct answer is correct.

## Generate a native backup
After configuring the course on your Moodle site, use Course reuse → Backup (or the site backup workflow) to create the `.mbz` file. This ensures the backup contains the correct Moodle version, course IDs, activity settings and site-specific plugins.
