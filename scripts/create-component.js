const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

const KNOWN_CATEGORIES = ['ui', 'layout', 'features'];

function toPascalCase(rawName) {
  const cleaned = rawName.trim().replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned) return '';
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

async function createComponent() {
  console.log('\n🚀 --- Gerador de Componentes --- 🚀\n');

  try {
    // 1. Nome do componente (validado e normalizado para PascalCase)
    const rawName = await askQuestion('Nome do componente (Ex: Button, HintRow): ');
    const componentName = toPascalCase(rawName);
    if (!componentName) {
      throw new Error('O nome do componente é obrigatório e deve conter letras/números!');
    }
    if (componentName !== rawName.trim()) {
      console.log(`ℹ️  Nome ajustado para PascalCase: ${componentName}`);
    }

    // 2. Categoria da pasta
    const categoryInput = (await askQuestion(`Categoria da pasta (${KNOWN_CATEGORIES.join(', ')}) [ui]: `)).trim().toLowerCase();
    const targetFolder = categoryInput || 'ui';
    if (!KNOWN_CATEGORIES.includes(targetFolder)) {
      console.log(`⚠️  "${targetFolder}" não é uma categoria conhecida (${KNOWN_CATEGORIES.join(', ')}). A criar mesmo assim.`);
    }

    // 3. Variante Web opcional (index.web.tsx + CSS module), à semelhança de AnimatedIcon
    const wantsWebVariant = (await askQuestion('Precisa de variante Web com CSS module (index.web.tsx)? (s/N): '))
      .trim()
      .toLowerCase()
      .startsWith('s');

    // 4. Caminhos
    const componentDir = path.join(__dirname, '..', 'src', 'components', targetFolder, componentName);

    if (fs.existsSync(componentDir)) {
      throw new Error(`O componente ${componentName} já existe na pasta ${targetFolder}!`);
    }
    fs.mkdirSync(componentDir, { recursive: true });

    // 5. Templates - alinhados com os tokens reais do design system (@/constants/theme, useTheme)
    const indexTsxTemplate = `import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ${componentName}Props extends ViewProps {
  title: string;
  subtitle?: string;
  themeColor?: ThemeColor;
}

export function ${componentName}({ title, subtitle, themeColor, style, ...rest }: ${componentName}Props) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme[themeColor ?? 'surfaceAlt'] }, style]}
      {...rest}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
});
`;

    const indexWebTsxTemplate = `import { View, type ViewProps } from 'react-native';

import styles from './styles.module.css';

export interface ${componentName}Props extends ViewProps {
  title: string;
  subtitle?: string;
}

export function ${componentName}({ title, subtitle, ...rest }: ${componentName}Props) {
  return (
    <View className={styles.container} {...rest}>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </View>
  );
}
`;

    const stylesCssTemplate = `.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 8px;
}

.title {
  font-weight: 600;
  font-size: 1.125rem;
}

.subtitle {
  font-weight: 400;
  font-size: 0.875rem;
}
`;

    const storiesTemplate = `import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { ${componentName} } from './index';

const meta = {
  title: '${targetFolder.toUpperCase()}/${componentName}',
  component: ${componentName},
  decorators: [
    (Story) => (
      <View style={{ padding: 32, flex: 1, justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ${componentName}>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '${componentName} Title',
    subtitle: 'This is an auto-generated component.',
  },
};
`;

    // 6. Escrever os ficheiros no disco
    const createdFiles = [];

    fs.writeFileSync(path.join(componentDir, 'index.tsx'), indexTsxTemplate);
    createdFiles.push('index.tsx');

    if (wantsWebVariant) {
      fs.writeFileSync(path.join(componentDir, 'index.web.tsx'), indexWebTsxTemplate);
      fs.writeFileSync(path.join(componentDir, 'styles.module.css'), stylesCssTemplate);
      createdFiles.push('index.web.tsx', 'styles.module.css');
    }

    // fs.writeFileSync(path.join(componentDir, `${componentName}.stories.tsx`), storiesTemplate);
    // createdFiles.push(`${componentName}.stories.tsx`);

    console.log(`\n✅ Sucesso! Componente criado em: src/components/${targetFolder}/${componentName}`);
    console.log('Ficheiros gerados:');
    createdFiles.forEach((file) => console.log(` 📄 ${file}`));
    console.log('');
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

createComponent();
