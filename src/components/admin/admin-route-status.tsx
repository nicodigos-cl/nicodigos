import Link from "next/link";
import type { IconType } from "react-icons";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type AdminRouteStatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline";
};

type AdminRouteStatusProps = {
  icon: IconType;
  title: string;
  description: string;
  digest?: string;
  actions?: AdminRouteStatusAction[];
};

export function AdminRouteStatus({
  icon: Icon,
  title,
  description,
  digest,
  actions,
}: AdminRouteStatusProps) {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {digest ? (
          <EmptyDescription className="font-mono text-xs">
            Ref: {digest}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {actions && actions.length > 0 ? (
        <EmptyContent className="flex-row flex-wrap justify-center">
          {actions.map((action) =>
            action.href ? (
              <Button
                key={action.label}
                variant={action.variant ?? "default"}
                nativeButton={false}
                render={<Link href={action.href} />}
              >
                {action.label}
              </Button>
            ) : (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ),
          )}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
