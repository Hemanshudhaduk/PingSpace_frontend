import { ReactNode } from "react";

type HeaderProps = {
  children?: ReactNode;
};

export default function Header({ children }: HeaderProps) {
  return (
    <div className="sidebar-header">
      {children ?? <div className="brand">PingSpace</div>}
    </div>
  );
}


