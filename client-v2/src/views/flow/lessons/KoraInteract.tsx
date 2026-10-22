import { useEffect, useState } from "react";
import type { FC, FormEvent } from "react";
import styled, { css } from "styled-components";

import { PgKora } from "./kora";
import type { KoraTx } from "./kora";
import Receipt from "./Receipt";
import { BrandPill, PlayIcon } from "../stages/EmptyStage";
import { useProgramInfo } from "../../../hooks";

/** Longest value the form takes: a name, and one line of log */
const ARG_MAX = 32;

const typeName = (type: unknown) =>
  typeof type === "string" ? type : JSON.stringify(type);

/**
 * Interact inside a tutorial: the program's instructions as forms, read
 * from the IDL the last build made, each one called through Kora.
 *
 * The product's Test UI sends a real transaction from the learner's wallet.
 * A tutorial's first deploy needs neither (Kora pays, see `kora.ts`), so the
 * forms here call the same way the deploy went, and every call leaves a
 * receipt under its form. Only `hello` is played out: it is the one
 * instruction Hello Anchor has.
 */
const KoraInteract: FC = () => {
  const { idl } = useProgramInfo();
  const [tx, setTx] = useState<KoraTx | null>(() => PgKora.lastTx);
  useEffect(() => PgKora.onDidChange(() => setTx(PgKora.lastTx)).dispose, []);

  const instructions = idl?.instructions ?? [];
  if (!instructions.length) {
    return (
      <Empty>
        Build the program: its instructions show up here, read from the IDL.
      </Empty>
    );
  }

  return (
    <List>
      {instructions.map((ix) => (
        <InstructionForm
          key={ix.name}
          name={ix.name}
          args={ix.args.map((a) => ({ name: a.name, type: typeName(a.type) }))}
          tx={tx}
        />
      ))}
    </List>
  );
};

export default KoraInteract;

const InstructionForm: FC<{
  name: string;
  args: { name: string; type: string }[];
  tx: KoraTx | null;
}> = ({ name, args, tx }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [calling, setCalling] = useState(false);
  const playable = name === "hello" && args.every((a) => a.type === "string");
  const ready = args.every((a) => values[a.name]?.trim());

  const call = async (e: FormEvent) => {
    e.preventDefault();
    if (!playable || !ready || calling) return;
    setCalling(true);
    try {
      const first = args[0] ? values[args[0].name].trim() : null;
      await PgKora.callHello(first);
    } finally {
      setCalling(false);
    }
  };

  const id = `ix-${name}`;
  return (
    <Card aria-labelledby={id}>
      <Head>
        <Name id={id}>{name}</Name>
        <Meta>
          {args.length
            ? args.map((a) => `${a.name}: ${a.type}`).join(", ")
            : "no arguments"}
          {" · "}no accounts to sign, Kora pays
        </Meta>
      </Head>
      <Form onSubmit={call}>
        {args.map((a) => (
          <Field key={a.name}>
            <FieldLabel htmlFor={`${id}-${a.name}`}>
              {a.name} <Type>{a.type}</Type>
            </FieldLabel>
            <Input
              id={`${id}-${a.name}`}
              value={values[a.name] ?? ""}
              maxLength={ARG_MAX}
              placeholder={a.name === "name" ? "Your name" : a.type}
              onChange={(e) =>
                setValues((v) => ({ ...v, [a.name]: e.target.value }))
              }
            />
          </Field>
        ))}
        <Submit>
          <BrandPill
            kind="primary"
            type="submit"
            disabled={!playable || !ready || calling}
            rightIcon={calling ? undefined : <PlayIcon />}
            title={
              playable ? undefined : "Only hello can be called on this stand"
            }
          >
            {calling ? "Calling..." : `Call ${name}`}
          </BrandPill>
        </Submit>
      </Form>
      {playable && tx && <Receipt tx={tx} />}
    </Card>
  );
};

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 1.5rem 2rem;
  max-width: 40rem;
`;

const Empty = styled.p`
  ${({ theme }) => css`
    margin: 0;
    padding: 1.5rem;
    font-size: 0.875rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Card = styled.section`
  ${({ theme }) => css`
    padding: 1rem 1.125rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.components.tooltip.bg};
  `}
`;

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Name = styled.h3`
  ${({ theme }) => css`
    margin: 0;
    font-family: ${theme.font.code.family};
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Meta = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Form = styled.form`
  margin-top: 0.875rem;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.625rem;
`;

const Field = styled.div`
  flex: 1 1 12rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FieldLabel = styled.label`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Type = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Input = styled.input`
  ${({ theme }) => css`
    height: 2.25rem;
    padding: 0 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-size: 0.875rem;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Submit = styled.div`
  flex-shrink: 0;
`;
