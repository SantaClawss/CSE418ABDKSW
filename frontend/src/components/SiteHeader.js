import React from "react";
import "./SiteHeader.css";
import Logo from "../LivestockEpidemicTracker.jpeg";

export default function SiteHeader() {
	return (
		<header className="site-header">
			<div className="site-header__inner">
				<img
					className="site-header__logo"
					src={Logo}
					alt="Livestock Epidemic Tracker logo"
				/>
				<h1 className="site-header__title">LIVESTOCK EPIDEMIC TRACKER</h1>
			</div>

			<div className="site-header__rule" />
		</header>
	);
}